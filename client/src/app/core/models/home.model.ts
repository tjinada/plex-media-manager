/**
 * Represents an active streaming session from Tautulli
 */
export interface StreamingSession {
  sessionKey: string;
  user: {
    name: string;
    id?: string;
    thumb?: string;
  };
  media: {
    type: 'movie' | 'episode';
    title: string;
    year?: number;
    showTitle?: string;
    seasonEpisode?: string;
    thumb?: string;
    grandparentThumb?: string;
    ratingKey?: string;
  };
  player: {
    name: string;
    platform: string;
    product?: string;
    device?: string;
  };
  // Source quality (original file)
  sourceQuality?: {
    resolution: string;
    videoCodec: string;
    audioCodec: string;
    audioChannels?: string;
    bitrate?: number;
    videoBitrate?: number;
    audioBitrate?: number;
    dynamicRange?: string;
    container?: string;
  };
  // Stream quality (what's being delivered)
  streamQuality?: {
    resolution: string;
    videoCodec: string;
    audioCodec: string;
    audioChannels?: string;
    bitrate?: number;
    videoBitrate?: number;
    audioBitrate?: number;
    dynamicRange?: string;
    container?: string;
  };
  // Legacy quality field (backward compatibility)
  quality: {
    resolution: string;
    videoCodec: string;
    audioCodec?: string;
  };
  playback: {
    decision: 'directplay' | 'transcode' | 'copy';
    progress: number;
    duration: number;
    state: 'playing' | 'paused' | 'buffering';
    startedAt?: string;
  };
  transcoding?: {
    videoDecision: 'directplay' | 'transcode' | 'copy';
    audioDecision: 'directplay' | 'transcode' | 'copy';
    hwDecode: boolean;
    hwEncode: boolean;
    hwDecodeCodec?: string;
    hwEncodeCodec?: string;
    subtitleDecision?: string;
    speed?: number;
    throttled?: boolean;
  };
  network: {
    location: 'lan' | 'wan';
    bandwidth?: number;
    secure: boolean;
    relayed?: boolean;
  };
}

/**
 * Represents an item in the download queue
 */
export interface DownloadItem {
  id: string;
  source: 'radarr' | 'sonarr' | 'nzbget' | 'qbittorrent';
  type: 'movie' | 'episode' | 'season' | 'usenet' | 'torrent' | 'unknown';
  title: string;
  status: 'downloading' | 'queued' | 'paused' | 'extracting' | 'importing' | 'seeding' | 'stalled' | 'error' | 'completed' | 'failed' | 'deleted';
  progress: number;
  size: number;
  sizeRemaining: number;
  speed?: number;
  eta?: string;
  etaSeconds?: number;
  quality?: string;
  indexer?: string;
  category?: string;
  added?: Date;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  // Torrent-specific fields
  seeds?: number;
  peers?: number;
  ratio?: number;
  // History fields
  completedAt?: Date;
}

/**
 * Downloads data with stats
 */
export interface DownloadsData {
  items: DownloadItem[];
  totalSpeed: number;
  totalActive: number;
  totalQueued: number;
}

/**
 * Quick stats for the home page header
 */
export interface QuickStats {
  streaming: {
    active: number;
    transcoding: number;
  };
  downloads: {
    active: number;
    queued: number;
    totalSpeed: number;
  };
  radarr: {
    missing: number;
    upcoming: number;
    upgrades: number;
    configured: boolean;
  };
  sonarr: {
    missing: number;
    upcoming: number;
    upgrades: number;
    configured: boolean;
  };
}

/**
 * Recent activity item
 */
export interface RecentActivity {
  id: string;
  type: 'watched' | 'downloaded' | 'added';
  timestamp: Date;
  media: {
    type: 'movie' | 'episode';
    title: string;
    year?: number;
    showTitle?: string;
    seasonEpisode?: string;
    thumb?: string;
    ratingKey?: string;
  };
  user?: string;
  details?: string;
  quality?: string;
  watchStatus?: 'completed' | 'partial' | 'abandoned';
  watchProgress?: number;
}

/**
 * Complete home page data response
 */
export interface HomeData {
  streaming: StreamingSession[];
  downloads: DownloadItem[];
  stats: QuickStats;
  recentActivity: RecentActivity[];
}

/**
 * Paginated activity response
 */
export interface ActivityResponse {
  activities: RecentActivity[];
  total: number;
  hasMore: boolean;
}

/**
 * WebSocket connection status
 */
export interface WebSocketStatus {
  connected: boolean;
  reconnecting: boolean;
  lastUpdate?: Date;
}

/**
 * Download client configuration (for settings)
 */
export interface NzbgetConfig {
  host: string;
  username?: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: Date;
}

export interface QbittorrentConfig {
  host: string;
  username?: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: Date;
}

/**
 * Calendar item from Radarr/Sonarr
 */
export interface CalendarItem {
  id: number;
  title: string;
  type: 'movie' | 'episode';
  // Movie fields
  year?: number;
  releaseDate?: string;
  releaseType?: 'digital' | 'physical' | 'theatrical';
  // Episode fields
  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  airDate?: string;
  runtime?: number;
  // Common fields
  hasFile: boolean;
  monitored: boolean;
  posterUrl?: string;
  overview?: string;
}

/**
 * Calendar response with grouped items
 */
export interface CalendarResponse {
  items: CalendarItem[];
  grouped: { [date: string]: CalendarItem[] };
  startDate: string;
  endDate: string;
}

/**
 * Service shortcut for quick access widget
 */
export interface ServiceShortcut {
  id: string;
  name: string;
  url: string;
  icon: 'plex' | 'nzbget' | 'radarr' | 'sonarr' | 'overseerr' | 'tautulli' | 'qbittorrent';
  configured: boolean;
  connected: boolean;
}

/**
 * Overseerr request for the requests widget
 */
export interface OverseerrRequestItem {
  id: number;
  type: 'movie' | 'tv';
  status: 'pending' | 'approved' | 'declined' | 'available' | 'unknown';
  mediaStatus: string;
  createdAt: string;
  updatedAt: string;
  media: {
    id: number;
    tmdbId: number;
    tvdbId?: number;
    title: string;
    posterPath?: string;
    backdropPath?: string;
    releaseDate?: string;
    status: string;
  };
  requestedBy: {
    id: number;
    displayName: string;
    avatar?: string;
  };
  seasons?: {
    seasonNumber: number;
    status: number;
  }[];
}
