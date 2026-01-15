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
    container?: string;
  };
  // Stream quality (what's being delivered)
  streamQuality?: {
    resolution: string;
    videoCodec: string;
    audioCodec: string;
    audioChannels?: string;
    bitrate?: number;
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
  status: 'downloading' | 'queued' | 'paused' | 'extracting' | 'importing' | 'seeding' | 'stalled' | 'error';
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
