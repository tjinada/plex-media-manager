import { Pagination } from './movie.model';

// Summary statistics
export interface TranscodingSummary {
  totalSessions: number;
  directPlayCount: number;
  transcodeCount: number;
  directStreamCount: number;
  videoTranscodes: number;
  audioTranscodes: number;
  directPlayRate: number;
  topDevice: {
    name: string;
    transcodeCount: number;
  } | null;
  topCodec: {
    name: string;
    transcodeCount: number;
  } | null;
}

// Time series data point
export interface DecisionOverTime {
  date: string;
  total: number;
  directPlay: number;
  transcodes: number;
}

// Transcode reason
export interface TranscodeReason {
  reason: string;
  label: string;
  count: number;
}

// Device statistics
export interface DeviceStats {
  deviceIdentifier: string;
  name: string;
  platform: string;
  product: string;
  totalPlays: number;
  directPlayCount: number;
  transcodeCount: number;
  directPlayRate: number;
  users: string[];
  topReasons: {
    reason: string;
    count: number;
  }[];
}

// Codec/format statistics
export interface FormatStats {
  name: string;
  totalPlays: number;
  directPlayCount: number;
  transcodeCount: number;
  directPlayRate: number;
}

// All format data
export interface FormatData {
  videoCodecs: FormatStats[];
  audioCodecs: FormatStats[];
  hdrTypes: FormatStats[];
  containers: FormatStats[];
}

// Format combination
export interface FormatCombination {
  videoCodec: string;
  audioCodec: string;
  container: string;
  hdrType: string;
  totalPlays: number;
  directPlayCount: number;
  transcodeCount: number;
  directPlayRate: number;
  affectedDevices: string[];
  fileCount: number;
}

// Media item transcoding stats
export interface MediaTranscodeStats {
  mediaItemId: string;
  mediaType: 'movie' | 'episode';
  ratingKey: string;
  title: string;
  showTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  year?: number;
  posterUrl?: string;
  transcodeCount: number;
  devices: string[];
  reasons: string[];
  mediaSnapshot: {
    videoCodec: string;
    audioCodec: string;
    resolution: string;
    container: string;
    bitrate: number;
    hdrType: string;
  };
  fileSize?: number;
}

export interface MediaTranscodeResponse {
  items: MediaTranscodeStats[];
  pagination: Pagination;
}

// User for filtering
export interface TranscodingUser {
  userId: string;
  userName: string;
  sessionCount: number;
}

// Recommendation action
export interface RecommendationAction {
  label: string;
  type: 'viewFiles' | 'searchRadarr' | 'searchSonarr' | 'viewDeviceContent' | 'viewAudioFiles' | 'viewVideoFiles' | 'viewCombination' | 'link';
  data?: any;
}

// Recommendation
export interface Recommendation {
  id: string;
  type: 'high' | 'medium' | 'low' | 'positive';
  icon: string;
  title: string;
  description: string;
  impact: {
    estimatedTranscodeReduction: number;
    affectedFiles: number | null;
    affectedStorage: number | null;
  };
  actions: RecommendationAction[];
  details?: any;
}

// Playback session
export interface PlaybackSession {
  sessionKey: string;
  mediaType: 'movie' | 'episode';
  mediaTitle: string;
  viewedAt: string;
  duration: number;
  userName: string;
  device: {
    name: string;
    platform: string;
    product: string;
  };
  playback: {
    videoDecision: 'directplay' | 'transcode' | 'copy';
    audioDecision: 'directplay' | 'transcode' | 'copy';
    subtitleDecision: string;
    transcodeReason: string;
  };
  mediaSnapshot: {
    videoCodec: string;
    audioCodec: string;
    resolution: string;
    hdrType: string;
  };
}

export interface SessionsResponse {
  items: PlaybackSession[];
  pagination: Pagination;
}

// Filter options
export type TimePeriod = '7d' | '30d' | '90d' | 'all';

// Media by codec response
export interface CodecMediaItem {
  mediaItemId: string;
  mediaType: 'movie' | 'episode';
  ratingKey: string;
  title: string;
  showTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  year?: number;
  posterUrl?: string;
  playCount: number;
  directPlayCount: number;
  transcodeCount: number;
  directPlayRate: number;
  devices: string[];
  resolution?: string;
  fileSize?: number;
  lastViewed: string;
}

export interface CodecMediaResponse {
  items: CodecMediaItem[];
  codecType: 'video' | 'audio';
  codecValue: string;
  pagination: Pagination;
}
