import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { HomeService, WebSocketService, PlexService } from '@core/services';
import {
  StreamingSession,
  DownloadItem,
  QuickStats,
  RecentActivity,
  WebSocketStatus
} from '@core/models';

type ActivityTab = 'watched' | 'downloaded' | 'added';
type DownloadFilter = 'all' | 'movies' | 'tv' | 'nzbget' | 'qbittorrent';

// Track session timing for live updates
interface SessionTiming {
  baseElapsedMs: number;
  lastUpdateTime: number;
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

  // UI State
  isLoading = true;
  connectionStatus: WebSocketStatus = { connected: false, reconnecting: false };
  activeActivityTab: ActivityTab = 'watched';
  activeDownloadFilter: DownloadFilter = 'all';
  activityOffset = 0;
  activityLimit = 10;
  hasMoreActivity = false;
  isLoadingMoreActivity = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Live timer tracking
  private sessionTimings: Map<string, SessionTiming> = new Map();
  private timerInterval: any = null;
  currentTime: number = Date.now(); // Used to trigger updates

  constructor(
    private homeService: HomeService,
    private wsService: WebSocketService,
    private plexService: PlexService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
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
      const baseElapsedMs = (session.playback.progress / 100) * session.playback.duration;
      this.sessionTimings.set(session.sessionKey, {
        baseElapsedMs,
        lastUpdateTime: now
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
   */
  getElapsedTime(session: StreamingSession): string {
    const timing = this.sessionTimings.get(session.sessionKey);
    
    if (!timing) {
      // Fallback if no timing data
      const elapsed = (session.playback.progress / 100) * session.playback.duration;
      return this.formatDuration(elapsed);
    }

    let elapsedMs = timing.baseElapsedMs;

    // Only add time delta if session is playing
    if (session.playback.state === 'playing') {
      const timeSinceUpdate = this.currentTime - timing.lastUpdateTime;
      elapsedMs += timeSinceUpdate;
    }

    // Don't exceed duration
    elapsedMs = Math.min(elapsedMs, session.playback.duration);

    return this.formatDuration(elapsedMs);
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
}
