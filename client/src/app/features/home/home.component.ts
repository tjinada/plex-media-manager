import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HomeService, WebSocketService, PlexService, OverseerrService } from '@core/services';
import { OverseerrRequest } from '@core/services/overseerr.service';
import {
  StreamingSession,
  DownloadItem,
  QuickStats,
  RecentActivity,
  WebSocketStatus,
  CalendarItem,
  ServiceShortcut
} from '@core/models';

type ActivityTab = 'watched' | 'downloaded' | 'added';
type DownloadFilter = 'all' | 'movies' | 'tv' | 'nzbget' | 'qbittorrent';

// Track session timing for live updates
interface SessionTiming {
  baseElapsedMs: number;
  lastUpdateTime: number;
  lastServerProgress: number; // Track server progress to detect seeks
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  // Data
  streaming: StreamingSession[] = [];
  downloads: DownloadItem[] = [];
  stats: QuickStats | null = null;
  recentActivity: RecentActivity[] = [];
  shortcuts: ServiceShortcut[] = [];
  calendarItems: CalendarItem[] = [];
  calendarGrouped: { [date: string]: CalendarItem[] } = {};
  requests: OverseerrRequest[] = [];
  pendingRequestsCount = 0;

  // UI State
  isLoading = true;
  connectionStatus: WebSocketStatus = { connected: false, reconnecting: false };
  activeActivityTab: ActivityTab = 'watched';
  activeDownloadFilter: DownloadFilter = 'all';
  activityOffset = 0;
  activityLimit = 10;
  hasMoreActivity = false;
  isLoadingMoreActivity = false;
  streamingViewMode: 'compact' | 'detailed' = 'compact';
  expandedSessionKey: string | null = null;
  downloadWidgetTab: 'queue' | 'history' = 'queue';
  requestsWidgetTab: 'pending' | 'all' = 'pending';
  calendarDays = 7;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Live timer tracking
  private sessionTimings: Map<string, SessionTiming> = new Map();
  private timerInterval: any = null;
  currentTime: number = Date.now(); // Used to trigger updates

  constructor(
    private homeService: HomeService,
    private wsService: WebSocketService,
    private plexService: PlexService,
    private overseerrService: OverseerrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadShortcuts();
    this.loadCalendar();
    this.loadRequests();
    this.setupWebSocket();
    this.startLiveTimer();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.wsService.disconnect();
    this.stopLiveTimer();
  }

  /**
   * Load initial data via REST API
   */
  private loadInitialData(): void {
    this.isLoading = true;

    this.homeService.getHomeData().subscribe({
      next: (data) => {
        this.streaming = data.streaming;
        this.downloads = data.downloads;
        this.stats = data.stats;
        this.recentActivity = data.recentActivity;
        this.hasMoreActivity = data.recentActivity.length >= this.activityLimit;
        this.isLoading = false;
        this.updateSessionTimings(data.streaming);
      },
      error: (error) => {
        console.error('Failed to load home data:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Setup WebSocket connection and subscriptions
   */
  private setupWebSocket(): void {
    // Connect to WebSocket
    this.wsService.connect();

    // Subscribe to connection status
    this.subscriptions.push(
      this.wsService.status$.subscribe(status => {
        this.connectionStatus = status;
      })
    );

    // Subscribe to streaming updates
    this.subscriptions.push(
      this.wsService.streaming$.subscribe(sessions => {
        if (sessions.length > 0 || this.streaming.length > 0) {
          this.streaming = sessions;
          this.updateSessionTimings(sessions);
        }
      })
    );

    // Subscribe to download updates
    this.subscriptions.push(
      this.wsService.downloads$.subscribe(downloads => {
        if (downloads.length > 0 || this.downloads.length > 0) {
          this.downloads = downloads;
        }
      })
    );

    // Subscribe to stats updates
    this.subscriptions.push(
      this.wsService.stats$.subscribe(stats => {
        if (stats) {
          this.stats = stats;
        }
      })
    );

    // Subscribe to new activity
    this.subscriptions.push(
      this.wsService.newActivity$.subscribe(activity => {
        // Prepend new activity to the list
        this.recentActivity = [activity, ...this.recentActivity.slice(0, this.activityLimit - 1)];
      })
    );
  }

  /**
   * Change activity tab and reload data
   */
  setActivityTab(tab: ActivityTab): void {
    if (this.activeActivityTab === tab) return;

    this.activeActivityTab = tab;
    this.activityOffset = 0;
    this.loadActivity();
  }

  /**
   * Load activity for current tab
   */
  private loadActivity(): void {
    const type = this.activeActivityTab === 'watched' ? 'watched' :
                 this.activeActivityTab === 'downloaded' ? 'downloaded' : 'added';

    this.homeService.getActivity(this.activityLimit, 0, type).subscribe({
      next: (response) => {
        this.recentActivity = response.activities;
        this.hasMoreActivity = response.hasMore;
        this.activityOffset = response.activities.length;
      },
      error: (error) => {
        console.error('Failed to load activity:', error);
      }
    });
  }

  /**
   * Load more activity items
   */
  loadMoreActivity(): void {
    if (this.isLoadingMoreActivity || !this.hasMoreActivity) return;

    this.isLoadingMoreActivity = true;
    const type = this.activeActivityTab === 'watched' ? 'watched' :
                 this.activeActivityTab === 'downloaded' ? 'downloaded' : 'added';

    this.homeService.getActivity(this.activityLimit, this.activityOffset, type).subscribe({
      next: (response) => {
        this.recentActivity = [...this.recentActivity, ...response.activities];
        this.hasMoreActivity = response.hasMore;
        this.activityOffset += response.activities.length;
        this.isLoadingMoreActivity = false;
      },
      error: (error) => {
        console.error('Failed to load more activity:', error);
        this.isLoadingMoreActivity = false;
      }
    });
  }

  /**
   * Set download filter
   */
  setDownloadFilter(filter: DownloadFilter): void {
    this.activeDownloadFilter = filter;
  }

  /**
   * Toggle streaming view mode
   */
  toggleStreamingView(): void {
    this.streamingViewMode = this.streamingViewMode === 'compact' ? 'detailed' : 'compact';
    this.expandedSessionKey = null;
  }

  /**
   * Toggle expanded state for a session (compact mode)
   */
  toggleSessionExpand(sessionKey: string, event: Event): void {
    event.stopPropagation();
    this.expandedSessionKey = this.expandedSessionKey === sessionKey ? null : sessionKey;
  }

  /**
   * Check if session is expanded
   */
  isSessionExpanded(sessionKey: string): boolean {
    return this.expandedSessionKey === sessionKey;
  }

  /**
   * Get filtered downloads based on active filter
   */
  get filteredDownloads(): DownloadItem[] {
    if (this.activeDownloadFilter === 'all') {
      return this.downloads;
    }

    return this.downloads.filter(d => {
      switch (this.activeDownloadFilter) {
        case 'movies':
          return d.type === 'movie';
        case 'tv':
          return d.type === 'episode' || d.type === 'season';
        case 'nzbget':
          return d.source === 'nzbget';
        case 'qbittorrent':
          return d.source === 'qbittorrent';
        default:
          return true;
      }
    });
  }

  /**
   * Get filtered activity based on active tab
   */
  get filteredActivity(): RecentActivity[] {
    return this.recentActivity.filter(a => {
      switch (this.activeActivityTab) {
        case 'watched':
          return a.type === 'watched';
        case 'downloaded':
          return a.type === 'downloaded';
        case 'added':
          return a.type === 'added';
        default:
          return true;
      }
    });
  }

  /**
   * Calculate total download speed
   */
  get totalDownloadSpeed(): number {
    return this.downloads.reduce((sum, d) => sum + (d.speed || 0), 0);
  }

  /**
   * Get active download count
   */
  get activeDownloads(): number {
    return this.downloads.filter(d => d.status === 'downloading').length;
  }

  /**
   * Get queued download count
   */
  get queuedDownloads(): number {
    return this.downloads.filter(d => d.status === 'queued').length;
  }

  /**
   * Get active downloads from NZBGet and qBittorrent only (for widget queue tab)
   * Excludes completed items (progress >= 100)
   */
  get downloadClientQueue(): DownloadItem[] {
    return this.downloads
      .filter(d => 
        (d.source === 'nzbget' || d.source === 'qbittorrent') &&
        (d.status === 'downloading' || d.status === 'queued' || d.status === 'paused') &&
        d.progress < 100
      )
      .slice(0, 5);
  }

  /**
   * Get completed/seeding downloads from NZBGet and qBittorrent (for widget history tab)
   * Note: 'seeding' = torrent finished downloading, 'importing' = being processed by arr
   */
  get downloadClientHistory(): DownloadItem[] {
    return this.downloads
      .filter(d => 
        (d.source === 'nzbget' || d.source === 'qbittorrent') &&
        (d.status === 'seeding' || d.status === 'importing' || d.status === 'extracting' || d.progress >= 100)
      )
      .slice(0, 5);
  }

  /**
   * Get count of active downloads from download clients
   */
  get downloadClientActiveCount(): number {
    return this.downloads.filter(d => 
      (d.source === 'nzbget' || d.source === 'qbittorrent') &&
      d.status === 'downloading'
    ).length;
  }

  /**
   * Get total speed from download clients only
   */
  get downloadClientSpeed(): number {
    return this.downloads
      .filter(d => d.source === 'nzbget' || d.source === 'qbittorrent')
      .reduce((sum, d) => sum + (d.speed || 0), 0);
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format speed (bytes/s) to human readable
   */
  formatSpeed(bytesPerSec: number): string {
    return this.formatBytes(bytesPerSec) + '/s';
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return then.toLocaleDateString();
  }

  /**
   * Get playback decision color class
   */
  getPlaybackDecisionClass(decision: string): string {
    switch (decision) {
      case 'directplay':
        return 'text-primary-400';
      case 'transcode':
        return 'text-amber-400';
      case 'copy':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }

  /**
   * Get playback decision label
   */
  getPlaybackDecisionLabel(decision: string): string {
    switch (decision) {
      case 'directplay':
        return 'Direct Play';
      case 'transcode':
        return 'Transcode';
      case 'copy':
        return 'Direct Stream';
      default:
        return decision;
    }
  }

  /**
   * Get download status color class
   */
  getDownloadStatusClass(status: string): string {
    switch (status) {
      case 'downloading':
        return 'bg-primary-500';
      case 'seeding':
        return 'bg-blue-500';
      case 'queued':
        return 'bg-gray-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Get progress bar width style
   */
  getProgressWidth(progress: number): string {
    return `${Math.min(100, Math.max(0, progress))}%`;
  }

  /**
   * Track by function for streaming sessions
   */
  trackBySession(index: number, session: StreamingSession): string {
    return session.sessionKey;
  }

  /**
   * Track by function for downloads
   */
  trackByDownload(index: number, download: DownloadItem): string {
    return download.id;
  }

  /**
   * Track by function for activity
   */
  trackByActivity(index: number, activity: RecentActivity): string {
    return activity.id;
  }

  /**
   * Get proxied image URL for Plex thumbnails
   */
  getImageUrl(path: string | undefined): string {
    return this.plexService.getImageUrl(path);
  }

  /**
   * Format duration in milliseconds to HH:MM:SS or MM:SS
   */
  formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Start live timer for updating play times
   */
  private startLiveTimer(): void {
    this.timerInterval = setInterval(() => {
      this.currentTime = Date.now();
    }, 1000);
  }

  /**
   * Stop live timer
   */
  private stopLiveTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update session timings when new data arrives
   */
  private updateSessionTimings(sessions: StreamingSession[]): void {
    const now = Date.now();
    
    // Update timings for each session
    sessions.forEach(session => {
      const serverElapsedMs = (session.playback.progress / 100) * session.playback.duration;
      this.sessionTimings.set(session.sessionKey, {
        baseElapsedMs: serverElapsedMs,
        lastUpdateTime: now,
        lastServerProgress: session.playback.progress
      });
    });

    // Clean up old sessions that no longer exist
    const currentKeys = new Set(sessions.map(s => s.sessionKey));
    this.sessionTimings.forEach((_, key) => {
      if (!currentKeys.has(key)) {
        this.sessionTimings.delete(key);
      }
    });
  }

  /**
   * Get elapsed time from progress percentage and duration (live updating)
   * Detects seek events by comparing current session progress with stored progress
   */
  getElapsedTime(session: StreamingSession): string {
    return this.formatDuration(this.getCurrentElapsedMs(session));
  }

  /**
   * Get current elapsed time in milliseconds with seek detection
   * This is the core timing logic used by all time-related methods
   */
  private getCurrentElapsedMs(session: StreamingSession): number {
    const timing = this.sessionTimings.get(session.sessionKey);
    const serverElapsedMs = (session.playback.progress / 100) * session.playback.duration;
    
    if (!timing) {
      return serverElapsedMs;
    }

    // Check if server progress has changed (user seeked or new WebSocket data)
    // If progress differs by more than 0.15%, snap to server value
    // For a 2.5 hour movie, 0.15% = ~13 seconds - catches most seeks
    const progressDiff = Math.abs(session.playback.progress - timing.lastServerProgress);
    if (progressDiff > 0.15) {
      // Server progress changed - update timing immediately
      this.sessionTimings.set(session.sessionKey, {
        baseElapsedMs: serverElapsedMs,
        lastUpdateTime: this.currentTime,
        lastServerProgress: session.playback.progress
      });
      return serverElapsedMs;
    }

    let elapsedMs = timing.baseElapsedMs;

    // Only add time delta if session is playing
    if (session.playback.state === 'playing') {
      const timeSinceUpdate = this.currentTime - timing.lastUpdateTime;
      elapsedMs += timeSinceUpdate;
    }

    // Don't exceed duration
    return Math.min(elapsedMs, session.playback.duration);
  }

  /**
   * Get total duration formatted
   */
  getTotalTime(session: StreamingSession): string {
    return this.formatDuration(session.playback.duration);
  }

  /**
   * Format bandwidth to human readable (Mbps/Kbps)
   */
  formatBandwidth(kbps: number | undefined): string {
    if (!kbps || kbps <= 0) return '';
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${Math.round(kbps)} Kbps`;
  }

  /**
   * Get transcode summary for display
   */
  getTranscodeSummary(session: StreamingSession): string {
    if (!session.transcoding) return '';
    
    const parts: string[] = [];
    
    // Video decision
    if (session.transcoding.videoDecision === 'transcode') {
      parts.push('Video: Transcode');
    } else if (session.transcoding.videoDecision === 'copy') {
      parts.push('Video: Direct Stream');
    }
    
    // Audio decision
    if (session.transcoding.audioDecision === 'transcode') {
      parts.push('Audio: Transcode');
    } else if (session.transcoding.audioDecision === 'copy') {
      parts.push('Audio: Direct Stream');
    }
    
    return parts.join(' • ');
  }

  /**
   * Get hardware acceleration info
   */
  getHwAccelInfo(session: StreamingSession): string {
    if (!session.transcoding) return '';
    
    const parts: string[] = [];
    if (session.transcoding.hwDecode) parts.push('HW Decode');
    if (session.transcoding.hwEncode) parts.push('HW Encode');
    
    return parts.length > 0 ? parts.join(' + ') : 'Software';
  }

  /**
   * Get transcode speed display
   */
  getTranscodeSpeed(session: StreamingSession): string {
    if (!session.transcoding?.speed) return '';
    return `${session.transcoding.speed.toFixed(1)}x`;
  }

  /**
   * Get playback state icon class
   */
  getPlaybackStateClass(state: string): string {
    switch (state) {
      case 'playing': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'buffering': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  }

  /**
   * Get remaining time
   */
  getRemainingTime(session: StreamingSession): string {
    const elapsedMs = this.getCurrentElapsedMs(session);
    const remaining = Math.max(0, session.playback.duration - elapsedMs);
    return this.formatDuration(remaining);
  }

  /**
   * Get ETA (end time)
   */
  getETA(session: StreamingSession): string {
    const elapsedMs = this.getCurrentElapsedMs(session);
    const remainingMs = Math.max(0, session.playback.duration - elapsedMs);
    const endTime = new Date(Date.now() + remainingMs);
    
    return endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  /**
   * Get session duration (how long they've been watching)
   */
  getSessionDuration(session: StreamingSession): string {
    if (!session.playback.startedAt) return '';
    const started = new Date(session.playback.startedAt).getTime();
    const duration = Date.now() - started;
    
    const mins = Math.floor(duration / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }

  /**
   * Check if quality is being downgraded
   */
  isQualityDowngraded(session: StreamingSession): boolean {
    if (!session.sourceQuality || !session.streamQuality) return false;
    return session.sourceQuality.resolution !== session.streamQuality.resolution;
  }

  /**
   * Get quality comparison string
   */
  getQualityComparison(session: StreamingSession): string {
    if (!session.sourceQuality || !session.streamQuality) return '';
    if (session.sourceQuality.resolution === session.streamQuality.resolution) return '';
    return `${session.sourceQuality.resolution} → ${session.streamQuality.resolution}`;
  }

  /**
   * Get stream health status based on transcode speed
   */
  getStreamHealth(session: StreamingSession): 'good' | 'warning' | 'poor' {
    if (session.playback.state === 'buffering') return 'poor';
    if (!session.transcoding?.speed) return 'good';
    
    if (session.transcoding.speed >= 2.0) return 'good';
    if (session.transcoding.speed >= 1.0) return 'warning';
    return 'poor';
  }

  /**
   * Get stream health color class
   */
  getStreamHealthClass(session: StreamingSession): string {
    const health = this.getStreamHealth(session);
    switch (health) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
    }
  }

  /**
   * Get device/platform icon name
   */
  getDeviceIcon(session: StreamingSession): string {
    const platform = (session.player.platform || '').toLowerCase();
    const product = (session.player.product || '').toLowerCase();
    const device = (session.player.device || '').toLowerCase();
    
    // Apple devices
    if (platform.includes('ios') || product.includes('iphone')) return 'iphone';
    if (platform.includes('tvos') || product.includes('apple tv')) return 'appletv';
    if (platform.includes('macos') || platform.includes('osx')) return 'mac';
    
    // Android
    if (platform.includes('android')) {
      if (product.includes('tv') || device.includes('tv')) return 'androidtv';
      return 'android';
    }
    
    // Smart TVs
    if (platform.includes('roku')) return 'roku';
    if (platform.includes('fire') || product.includes('fire')) return 'firetv';
    if (platform.includes('samsung') || platform.includes('tizen')) return 'smarttv';
    if (platform.includes('lg') || platform.includes('webos')) return 'smarttv';
    if (platform.includes('chromecast')) return 'chromecast';
    
    // Consoles
    if (platform.includes('playstation') || platform.includes('ps4') || platform.includes('ps5')) return 'playstation';
    if (platform.includes('xbox')) return 'xbox';
    
    // Desktop
    if (platform.includes('windows')) return 'windows';
    if (platform.includes('linux')) return 'linux';
    
    // Web
    if (product.includes('web') || platform.includes('chrome') || platform.includes('firefox') || platform.includes('safari')) return 'web';
    
    return 'device';
  }

  /**
   * Format audio channels display
   */
  formatAudioChannels(channels: string | undefined): string {
    if (!channels) return '';
    
    // Handle common formats
    if (channels.includes('7.1')) return '7.1';
    if (channels.includes('5.1')) return '5.1';
    if (channels.includes('stereo') || channels === '2') return '2.0';
    if (channels.includes('mono') || channels === '1') return '1.0';
    
    return channels;
  }

  /**
   * Navigate to media detail page
   */
  navigateToMedia(session: StreamingSession, event: Event): void {
    event.stopPropagation();
    if (!session.media.ratingKey) return;
    
    if (session.media.type === 'movie') {
      // Need to find the movie ID from ratingKey
      // For now, we'll search - in future could have a lookup endpoint
      this.router.navigate(['/movies'], { queryParams: { search: session.media.title } });
    } else {
      this.router.navigate(['/shows'], { queryParams: { search: session.media.showTitle || session.media.title } });
    }
  }

  // ===== Shortcuts Methods =====

  /**
   * Load service shortcuts
   */
  private loadShortcuts(): void {
    this.homeService.getShortcuts().subscribe({
      next: (response) => {
        this.shortcuts = response.shortcuts;
      },
      error: (error) => {
        console.error('Failed to load shortcuts:', error);
      }
    });
  }

  /**
   * Open shortcut in new tab
   */
  openShortcut(shortcut: ServiceShortcut): void {
    if (shortcut.url) {
      window.open(shortcut.url, '_blank');
    }
  }

  // ===== Calendar Methods =====

  /**
   * Load calendar data
   */
  private loadCalendar(): void {
    this.homeService.getCalendar(this.calendarDays).subscribe({
      next: (response) => {
        this.calendarItems = response.items;
        this.calendarGrouped = response.grouped;
      },
      error: (error) => {
        console.error('Failed to load calendar:', error);
      }
    });
  }

  /**
   * Get calendar dates for display
   */
  get calendarDates(): string[] {
    return Object.keys(this.calendarGrouped).sort();
  }

  /**
   * Format calendar date for display
   */
  formatCalendarDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }

  /**
   * Format air time for calendar item
   */
  formatAirTime(item: CalendarItem): string {
    const dateStr = item.airDate || item.releaseDate;
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // ===== Requests Methods =====

  /**
   * Load Overseerr requests
   */
  private loadRequests(): void {
    // Load pending count
    this.overseerrService.getPendingCount().subscribe({
      next: (response) => {
        this.pendingRequestsCount = response.pending;
      },
      error: () => {
        // Overseerr might not be configured
      }
    });

    // Load requests based on tab
    this.loadRequestsByTab();
  }

  /**
   * Load requests by current tab selection
   */
  loadRequestsByTab(): void {
    const status = this.requestsWidgetTab === 'pending' ? 1 : undefined; // 1 = pending
    this.homeService.getRequests({ status, take: 5 }).subscribe({
      next: (response) => {
        this.requests = response.results;
      },
      error: () => {
        this.requests = [];
      }
    });
  }

  /**
   * Set requests widget tab
   */
  setRequestsTab(tab: 'pending' | 'all'): void {
    this.requestsWidgetTab = tab;
    this.loadRequestsByTab();
  }

  /**
   * Get Overseerr poster URL
   */
  getOverseerrPosterUrl(posterPath: string | undefined): string {
    if (!posterPath) return '';
    return `https://image.tmdb.org/t/p/w92${posterPath}`;
  }

  /**
   * Approve request
   */
  approveRequest(request: OverseerrRequest, event: Event): void {
    event.stopPropagation();
    this.overseerrService.approveRequest(request.id).subscribe({
      next: () => {
        this.loadRequests();
      },
      error: (error) => {
        console.error('Failed to approve request:', error);
      }
    });
  }

  /**
   * Decline request
   */
  declineRequest(request: OverseerrRequest, event: Event): void {
    event.stopPropagation();
    this.overseerrService.declineRequest(request.id).subscribe({
      next: () => {
        this.loadRequests();
      },
      error: (error) => {
        console.error('Failed to decline request:', error);
      }
    });
  }
}
