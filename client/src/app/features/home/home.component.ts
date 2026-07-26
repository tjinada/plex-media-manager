import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HomeService, WebSocketService, PlexService, OverseerrService } from '@core/services';
import { OverseerrRequest } from '@core/services/overseerr.service';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { PullToRefreshDirective } from '@shared/directives/pull-to-refresh.directive';
import {
  StreamingSession,
  DownloadItem,
  QuickStats,
  RecentActivity,
  WebSocketStatus,
  CalendarItem,
  CalendarResponse,
  ServiceShortcut
} from '@core/models';

type ActivityTab = 'watched' | 'downloaded' | 'added';
type DownloadFilter = 'all' | 'movies' | 'tv' | 'nzbget' | 'qbittorrent';

interface SessionTiming {
  baseElapsedMs: number;
  lastUpdateTime: number;
  lastServerProgress: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent, PullToRefreshDirective],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  // Data from service observables
  streaming: StreamingSession[] = [];
  downloads: DownloadItem[] = [];
  stats: QuickStats | null = null;
  recentActivity: RecentActivity[] = [];
  shortcuts: ServiceShortcut[] = [];
  calendarData: CalendarResponse | null = null;
  requests: OverseerrRequest[] = [];
  pendingRequestsCount = 0;

  // Per-section loading flags
  streamingLoading = false;
  downloadsLoading = false;
  statsLoading = false;
  activityLoading = false;
  shortcutsLoading = false;
  calendarLoading = false;
  requestsLoading = false;

  // UI State
  connectionStatus: WebSocketStatus = { connected: false, reconnecting: false };
  activeActivityTab: ActivityTab = 'watched';
  activeDownloadFilter: DownloadFilter = 'all';
  hasMoreActivity = false;
  isLoadingMoreActivity = false;
  downloadWidgetTab: 'queue' | 'history' = 'queue';
  requestsWidgetTab: 'pending' | 'all' = 'pending';
  calendarDays = 7;
  shortcutsExpanded = false;

  // Activity Modal
  showActivityModal = false;
  modalActivities: RecentActivity[] = [];
  modalActivityType: ActivityTab = 'watched';
  modalOffset = 0;
  modalLimit = 50;
  modalHasMore = false;
  isLoadingModalActivity = false;

  private subscriptions: Subscription[] = [];
  private sessionTimings: Map<string, SessionTiming> = new Map();
  private timerInterval: any = null;
  currentTime: number = Date.now();

  constructor(
    private homeService: HomeService,
    private wsService: WebSocketService,
    private plexService: PlexService,
    private overseerrService: OverseerrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscribeToService();
    this.setupWebSocket();
    this.startLiveTimer();
    this.homeService.refreshAll();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.wsService.disconnect();
    this.stopLiveTimer();
  }

  private subscribeToService(): void {
    this.subscriptions.push(
      this.homeService.streaming$.subscribe(data => { this.streaming = data; this.updateSessionTimings(data); }),
      this.homeService.downloads$.subscribe(data => this.downloads = data),
      this.homeService.stats$.subscribe(data => this.stats = data),
      this.homeService.activity$.subscribe(data => { this.recentActivity = data; this.hasMoreActivity = data.length >= 10; }),
      this.homeService.shortcuts$.subscribe(data => this.shortcuts = data),
      this.homeService.calendar$.subscribe(data => this.calendarData = data),
      this.homeService.requests$.subscribe(data => this.requests = data),
      this.homeService.pendingCount$.subscribe(count => this.pendingRequestsCount = count),
      this.homeService.streamingLoading$.subscribe(v => this.streamingLoading = v),
      this.homeService.downloadsLoading$.subscribe(v => this.downloadsLoading = v),
      this.homeService.statsLoading$.subscribe(v => this.statsLoading = v),
      this.homeService.activityLoading$.subscribe(v => this.activityLoading = v),
      this.homeService.shortcutsLoading$.subscribe(v => this.shortcutsLoading = v),
      this.homeService.calendarLoading$.subscribe(v => this.calendarLoading = v),
      this.homeService.requestsLoading$.subscribe(v => this.requestsLoading = v)
    );
  }

  onPullRefresh(): void { this.homeService.refreshAll(); }

  private setupWebSocket(): void {
    this.wsService.connect();
    this.subscriptions.push(
      this.wsService.status$.subscribe(status => this.connectionStatus = status),
      this.wsService.streaming$.subscribe(sessions => { if (sessions.length > 0 || this.streaming.length > 0) this.homeService.updateStreaming(sessions); }),
      this.wsService.downloads$.subscribe(downloads => { if (downloads.length > 0 || this.downloads.length > 0) this.homeService.updateDownloads(downloads); }),
      this.wsService.stats$.subscribe(stats => { if (stats) this.homeService.updateStats(stats); }),
      this.wsService.newActivity$.subscribe(activity => this.homeService.prependActivity(activity)),
      this.wsService.activityRefresh$.subscribe(() => this.homeService.refreshActivity(10, 0, this.activeActivityTab === 'watched' ? 'watched' : this.activeActivityTab === 'downloaded' ? 'downloaded' : 'added'))
    );
  }

  // Computed properties
  get calendarGrouped(): { [date: string]: CalendarItem[] } { return this.calendarData?.grouped || {}; }
  get calendarDates(): string[] { return Object.keys(this.calendarGrouped).sort(); }
  get hasStreamingData(): boolean { return this.streaming.length > 0; }
  get hasStatsData(): boolean { return this.stats !== null; }
  get hasDownloadsData(): boolean { return this.downloads.length > 0; }
  get hasActivityData(): boolean { return this.recentActivity.length > 0; }
  get hasShortcutsData(): boolean { return this.shortcuts.length > 0; }
  get hasCalendarData(): boolean { return this.calendarData !== null && this.calendarDates.length > 0; }
  get hasRequestsData(): boolean { return this.requests.length > 0; }

  // Skeleton states: show only when loading AND no cached data
  get showStreamingSkeleton(): boolean { return this.streamingLoading && !this.hasStreamingData && !this.homeService.hasLoadedOnce; }
  get showStatsSkeleton(): boolean { return this.statsLoading && !this.hasStatsData; }
  get showDownloadsSkeleton(): boolean { return this.downloadsLoading && !this.hasDownloadsData && !this.homeService.hasLoadedOnce; }
  get showActivitySkeleton(): boolean { return this.activityLoading && !this.hasActivityData; }
  get showShortcutsSkeleton(): boolean { return this.shortcutsLoading && !this.hasShortcutsData; }
  get showCalendarSkeleton(): boolean { return this.calendarLoading && !this.hasCalendarData; }
  get showRequestsSkeleton(): boolean { return this.requestsLoading && !this.hasRequestsData; }

  // Activity
  setActivityTab(tab: ActivityTab): void { if (this.activeActivityTab === tab) return; this.activeActivityTab = tab; this.homeService.refreshActivity(10, 0, tab); }

  loadMoreActivity(): void {
    if (this.isLoadingMoreActivity || !this.hasMoreActivity) return;
    this.isLoadingMoreActivity = true;
    this.homeService.getActivity(10, this.recentActivity.length, this.activeActivityTab).subscribe({
      next: (response) => { this.recentActivity = [...this.recentActivity, ...response.activities]; this.hasMoreActivity = response.hasMore; this.isLoadingMoreActivity = false; },
      error: () => { this.isLoadingMoreActivity = false; }
    });
  }

  // Downloads
  setDownloadFilter(filter: DownloadFilter): void { this.activeDownloadFilter = filter; }

  get filteredDownloads(): DownloadItem[] {
    if (this.activeDownloadFilter === 'all') return this.downloads;
    return this.downloads.filter(d => {
      switch (this.activeDownloadFilter) {
        case 'movies': return d.type === 'movie';
        case 'tv': return d.type === 'episode' || d.type === 'season';
        case 'nzbget': return d.source === 'nzbget';
        case 'qbittorrent': return d.source === 'qbittorrent';
        default: return true;
      }
    });
  }

  get filteredActivity(): RecentActivity[] {
    return this.recentActivity.filter(a => {
      const matchesTab = this.activeActivityTab === 'watched' ? a.type === 'watched' : this.activeActivityTab === 'downloaded' ? a.type === 'downloaded' : a.type === 'added';
      if (!matchesTab) return false;
      if (this.activeActivityTab === 'watched' && this.streaming.length > 0) {
        if (this.streaming.some(s => a.media.ratingKey === s.media.ratingKey && a.user === s.user.name)) return false;
      }
      return true;
    });
  }

  get totalDownloadSpeed(): number { return this.downloads.reduce((sum, d) => sum + (d.speed || 0), 0); }
  get activeDownloads(): number { return this.downloads.filter(d => d.status === 'downloading').length; }
  get queuedDownloads(): number { return this.downloads.filter(d => d.status === 'queued').length; }
  get downloadClientQueue(): DownloadItem[] { return this.downloads.filter(d => (d.source === 'nzbget' || d.source === 'qbittorrent') && (d.status === 'downloading' || d.status === 'queued' || d.status === 'paused') && d.progress < 100).slice(0, 5); }
  get downloadClientHistory(): DownloadItem[] { return this.downloads.filter(d => (d.source === 'nzbget' || d.source === 'qbittorrent') && (d.status === 'seeding' || d.status === 'importing' || d.status === 'extracting' || d.status === 'completed' || d.status === 'failed' || d.progress >= 100)).slice(0, 5); }
  get downloadClientActiveCount(): number { return this.downloads.filter(d => (d.source === 'nzbget' || d.source === 'qbittorrent') && d.status === 'downloading').length; }
  get downloadClientSpeed(): number { return this.downloads.filter(d => d.source === 'nzbget' || d.source === 'qbittorrent').reduce((sum, d) => sum + (d.speed || 0), 0); }

  // Streaming
  toggleShortcuts(): void { this.shortcutsExpanded = !this.shortcutsExpanded; }

  // Formatting helpers
  formatBytes(bytes: number): string { if (!bytes || bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]; }
  formatSpeed(bytesPerSec: number): string { return this.formatBytes(bytesPerSec) + '/s'; }

  formatRelativeTime(date: Date | string): string {
    const now = new Date(); const then = new Date(date); const diffMs = now.getTime() - then.getTime(); const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60); if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24); if (diffDays === 1) return 'Yesterday'; if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  }

  formatRequestDateTime(date: Date | string): string { const then = new Date(date); return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + then.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  getPlaybackDecisionClass(decision: string): string { switch (decision) { case 'directplay': return 'text-primary-400'; case 'transcode': return 'text-amber-400'; case 'copy': return 'text-blue-400'; default: return 'text-gray-400'; } }
  getPlaybackDecisionLabel(decision: string): string { switch (decision) { case 'directplay': return 'Direct Play'; case 'transcode': return 'Transcode'; case 'copy': return 'Direct Stream'; default: return decision; } }
  getDownloadStatusClass(status: string): string { switch (status) { case 'downloading': return 'bg-primary-500'; case 'seeding': return 'bg-blue-500'; case 'queued': return 'bg-gray-500'; case 'paused': return 'bg-yellow-500'; case 'error': return 'bg-red-500'; default: return 'bg-gray-500'; } }
  getProgressWidth(progress: number): string { return `${Math.min(100, Math.max(0, progress))}%`; }
  trackBySession(index: number, session: StreamingSession): string { return session.sessionKey; }
  trackByDownload(index: number, download: DownloadItem): string { return download.id; }
  trackByActivity(index: number, activity: RecentActivity): string { return activity.id; }
  getImageUrl(path: string | undefined): string { return this.plexService.getImageUrl(path); }
  getSessionPoster(session: StreamingSession): string { return session.media.type === 'episode' && session.media.grandparentThumb ? this.plexService.getImageUrl(session.media.grandparentThumb) : this.plexService.getImageUrl(session.media.thumb); }
  getActivityImageUrl(url: string | undefined): string { if (!url) return ''; if (url.startsWith('http://') || url.startsWith('https://')) return url; return this.plexService.getImageUrl(url); }

  formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '0:00'; const totalSeconds = Math.floor(ms / 1000); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Live timer
  private startLiveTimer(): void { this.timerInterval = setInterval(() => { this.currentTime = Date.now(); }, 1000); }
  private stopLiveTimer(): void { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } }

  private updateSessionTimings(sessions: StreamingSession[]): void {
    const now = Date.now();
    sessions.forEach(session => {
      const serverElapsedMs = (session.playback.progress / 100) * session.playback.duration;
      this.sessionTimings.set(session.sessionKey, { baseElapsedMs: serverElapsedMs, lastUpdateTime: now, lastServerProgress: session.playback.progress });
    });
    const currentKeys = new Set(sessions.map(s => s.sessionKey));
    this.sessionTimings.forEach((_, key) => { if (!currentKeys.has(key)) this.sessionTimings.delete(key); });
  }

  getElapsedTime(session: StreamingSession): string { return this.formatDuration(this.getCurrentElapsedMs(session)); }

  private getCurrentElapsedMs(session: StreamingSession): number {
    const timing = this.sessionTimings.get(session.sessionKey);
    const serverElapsedMs = (session.playback.progress / 100) * session.playback.duration;
    if (!timing) return serverElapsedMs;
    if (Math.abs(session.playback.progress - timing.lastServerProgress) > 0.15) {
      this.sessionTimings.set(session.sessionKey, { baseElapsedMs: serverElapsedMs, lastUpdateTime: this.currentTime, lastServerProgress: session.playback.progress });
      return serverElapsedMs;
    }
    let elapsedMs = timing.baseElapsedMs;
    if (session.playback.state === 'playing') elapsedMs += this.currentTime - timing.lastUpdateTime;
    return Math.min(elapsedMs, session.playback.duration);
  }

  getTotalTime(session: StreamingSession): string { return this.formatDuration(session.playback.duration); }
  formatBandwidth(kbps: number | undefined): string { if (!kbps || kbps <= 0) return ''; if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`; return `${Math.round(kbps)} Kbps`; }

  getTranscodeSummary(session: StreamingSession): string {
    if (!session.transcoding) return '';
    const parts: string[] = [];
    const stream = session.streamQuality;
    if (session.transcoding.videoDecision === 'transcode') {
      let v = 'Video: Transcode';
      if (stream?.videoCodec && stream.videoCodec !== 'Unknown') v += ` → ${stream.videoCodec.toUpperCase()}`;
      if (stream?.videoBitrate) v += ` ${this.formatBandwidth(stream.videoBitrate)}`;
      parts.push(v);
    } else if (session.transcoding.videoDecision === 'copy') {
      parts.push('Video: Direct Stream');
    }
    if (session.transcoding.audioDecision === 'transcode') {
      let a = 'Audio: Transcode';
      if (stream?.audioCodec && stream.audioCodec !== 'Unknown') a += ` → ${stream.audioCodec.toUpperCase()}`;
      if (stream?.audioBitrate) a += ` ${this.formatBandwidth(stream.audioBitrate)}`;
      parts.push(a);
    } else if (session.transcoding.audioDecision === 'copy') {
      parts.push('Audio: Direct Stream');
    }
    return parts.join(' • ');
  }

  getHwAccelInfo(session: StreamingSession): string {
    if (!session.transcoding) return '';
    const t = session.transcoding;
    const parts: string[] = [];
    if (t.hwDecode) parts.push(t.hwDecodeCodec ? `HW Decode (${t.hwDecodeCodec})` : 'HW Decode');
    if (t.hwEncode) parts.push(t.hwEncodeCodec ? `HW Encode (${t.hwEncodeCodec})` : 'HW Encode');
    return parts.length > 0 ? parts.join(' + ') : 'Software';
  }
  getTranscodeSpeed(session: StreamingSession): string { if (!session.transcoding?.speed) return ''; return `${session.transcoding.speed.toFixed(1)}x`; }
  getPlaybackStateClass(state: string): string { switch (state) { case 'playing': return 'text-green-400'; case 'paused': return 'text-yellow-400'; case 'buffering': return 'text-blue-400'; default: return 'text-gray-400'; } }
  getRemainingTime(session: StreamingSession): string { return this.formatDuration(Math.max(0, session.playback.duration - this.getCurrentElapsedMs(session))); }
  getETA(session: StreamingSession): string { const remainingMs = Math.max(0, session.playback.duration - this.getCurrentElapsedMs(session)); return new Date(Date.now() + remainingMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  getSessionDuration(session: StreamingSession): string { if (!session.playback.startedAt) return ''; const mins = Math.floor((Date.now() - new Date(session.playback.startedAt).getTime()) / 60000); if (mins < 60) return `${mins}m`; return `${Math.floor(mins / 60)}h ${mins % 60}m`; }
  isQualityDowngraded(session: StreamingSession): boolean { if (!session.sourceQuality || !session.streamQuality) return false; return session.sourceQuality.resolution !== session.streamQuality.resolution; }
  getQualityComparison(session: StreamingSession): string { if (!session.sourceQuality || !session.streamQuality) return ''; if (session.sourceQuality.resolution === session.streamQuality.resolution) return ''; return `${session.sourceQuality.resolution} → ${session.streamQuality.resolution}`; }
  getResolutionDisplay(session: StreamingSession): string { const cmp = this.getQualityComparison(session); if (cmp) return cmp; return session.sourceQuality?.resolution || session.streamQuality?.resolution || session.quality.resolution; }
  getHdrBadge(session: StreamingSession): string {
    const src = session.sourceQuality?.dynamicRange;
    if (!src || src.toUpperCase() === 'SDR') return '';
    const out = session.streamQuality?.dynamicRange;
    if (out && out !== src) return `${src} → ${out}`;
    return src;
  }
  isSubtitleBurn(session: StreamingSession): boolean { return session.transcoding?.subtitleDecision === 'burn'; }
  getSourceBitrate(session: StreamingSession): string { return this.formatBandwidth(session.sourceQuality?.bitrate); }
  getStreamHealth(session: StreamingSession): 'good' | 'warning' | 'poor' { if (session.playback.state === 'buffering') return 'poor'; if (!session.transcoding?.speed) return 'good'; if (session.transcoding.speed >= 2.0) return 'good'; if (session.transcoding.speed >= 1.0) return 'warning'; return 'poor'; }
  getStreamHealthClass(session: StreamingSession): string { const h = this.getStreamHealth(session); return h === 'good' ? 'bg-green-500' : h === 'warning' ? 'bg-yellow-500' : 'bg-red-500'; }

  getDeviceIcon(session: StreamingSession): string {
    const p = (session.player.platform || '').toLowerCase(); const pr = (session.player.product || '').toLowerCase(); const d = (session.player.device || '').toLowerCase();
    if (p.includes('ios') || pr.includes('iphone')) return 'iphone'; if (p.includes('tvos') || pr.includes('apple tv')) return 'appletv'; if (p.includes('macos') || p.includes('osx')) return 'mac';
    if (p.includes('android')) return pr.includes('tv') || d.includes('tv') ? 'androidtv' : 'android';
    if (p.includes('roku')) return 'roku'; if (p.includes('fire') || pr.includes('fire')) return 'firetv'; if (p.includes('samsung') || p.includes('tizen') || p.includes('lg') || p.includes('webos')) return 'smarttv';
    if (p.includes('chromecast')) return 'chromecast'; if (p.includes('playstation') || p.includes('ps4') || p.includes('ps5')) return 'playstation'; if (p.includes('xbox')) return 'xbox';
    if (p.includes('windows')) return 'windows'; if (p.includes('linux')) return 'linux'; if (pr.includes('web') || p.includes('chrome') || p.includes('firefox') || p.includes('safari')) return 'web';
    return 'device';
  }

  formatAudioChannels(channels: string | undefined): string { if (!channels) return ''; if (channels.includes('7.1')) return '7.1'; if (channels.includes('5.1')) return '5.1'; if (channels.includes('stereo') || channels === '2') return '2.0'; if (channels.includes('mono') || channels === '1') return '1.0'; return channels; }

  navigateToMedia(session: StreamingSession, event: Event): void {
    event.stopPropagation(); if (!session.media.ratingKey) return;
    if (session.media.type === 'movie') this.router.navigate(['/movies'], { queryParams: { search: session.media.title } });
    else this.router.navigate(['/shows'], { queryParams: { search: session.media.showTitle || session.media.title } });
  }

  openShortcut(shortcut: ServiceShortcut): void { if (shortcut.url) window.open(shortcut.url, '_blank'); }

  // Calendar
  formatCalendarDate(dateStr: string): string { const date = new Date(dateStr + 'T00:00:00'); const today = new Date(); today.setHours(0, 0, 0, 0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1); if (date.getTime() === today.getTime()) return 'Today'; if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'; return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  formatAirTime(item: CalendarItem): string { const dateStr = item.airDate || item.releaseDate; if (!dateStr) return ''; return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

  // Requests
  getOverseerrPosterUrl(posterPath: string | undefined): string { if (!posterPath) return ''; return `https://image.tmdb.org/t/p/w92${posterPath}`; }
  approveRequest(request: OverseerrRequest, event: Event): void { event.stopPropagation(); this.overseerrService.approveRequest(request.id).subscribe({ next: () => this.homeService.refreshRequests(), error: (e) => console.error('Failed to approve:', e) }); }
  declineRequest(request: OverseerrRequest, event: Event): void { event.stopPropagation(); this.overseerrService.declineRequest(request.id).subscribe({ next: () => this.homeService.refreshRequests(), error: (e) => console.error('Failed to decline:', e) }); }

  // Activity Modal
  openActivityModal(): void { this.showActivityModal = true; this.modalActivityType = this.activeActivityTab; this.modalOffset = 0; this.modalActivities = []; this.loadModalActivity(); }
  closeActivityModal(): void { this.showActivityModal = false; this.modalActivities = []; }
  setModalActivityTab(tab: ActivityTab): void { if (this.modalActivityType === tab) return; this.modalActivityType = tab; this.modalOffset = 0; this.modalActivities = []; this.loadModalActivity(); }

  private loadModalActivity(): void {
    this.isLoadingModalActivity = true;
    this.homeService.getActivity(this.modalLimit, this.modalOffset, this.modalActivityType).subscribe({
      next: (response) => { this.modalActivities = response.activities; this.modalHasMore = response.hasMore; this.modalOffset = response.activities.length; this.isLoadingModalActivity = false; },
      error: () => { this.isLoadingModalActivity = false; }
    });
  }

  loadMoreModalActivity(): void {
    if (this.isLoadingModalActivity || !this.modalHasMore) return;
    this.isLoadingModalActivity = true;
    this.homeService.getActivity(this.modalLimit, this.modalOffset, this.modalActivityType).subscribe({
      next: (response) => { this.modalActivities = [...this.modalActivities, ...response.activities]; this.modalHasMore = response.hasMore; this.modalOffset += response.activities.length; this.isLoadingModalActivity = false; },
      error: () => { this.isLoadingModalActivity = false; }
    });
  }

  get filteredModalActivity(): RecentActivity[] {
    return this.modalActivities.filter(a => {
      if (this.modalActivityType === 'watched' && this.streaming.length > 0) {
        if (this.streaming.some(s => a.media.ratingKey === s.media.ratingKey && a.user === s.user.name)) return false;
      }
      return true;
    });
  }

  onModalScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && !this.isLoadingModalActivity && this.modalHasMore) this.loadMoreModalActivity();
  }
}
