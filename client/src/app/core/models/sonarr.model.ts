export interface SonarrConfig {
  host: string;
  enabled: boolean;
  isConnected: boolean;
  version: string | null;
  lastCheckedAt: string | null;
  maxEpisodeSize: number;
}

export interface SonarrTestResult {
  success: boolean;
  version?: string;
  appName?: string;
}

export interface SonarrMissingEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string | null;
  monitored: boolean;
  posterUrl: string | null;
}

export interface SonarrUpcomingEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string | null;
  monitored: boolean;
  posterUrl: string | null;
}

export interface SonarrUpgradeEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  monitored: boolean;
  currentQuality: string;
  targetQuality: string;
  fileSize: number;
  posterUrl: string | null;
}

export interface SonarrDowngradeEpisode {
  id: number;
  seriesId: number;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  monitored: boolean;
  currentQuality: string;
  targetQuality: string;
  fileSize: number;
  estimatedSavings: number;
  posterUrl: string | null;
  reason: 'quality' | 'size' | 'both';
}

export interface SonarrMissingResponse {
  episodes: SonarrMissingEpisode[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SonarrUpcomingResponse {
  episodes: SonarrUpcomingEpisode[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SonarrUpgradesResponse {
  episodes: SonarrUpgradeEpisode[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SonarrDowngradesResponse {
  episodes: SonarrDowngradeEpisode[];
  total: number;
  totalEstimatedSavings: number;
}

export interface SonarrStats {
  missing: number;
  upcoming: number;
  upgrades: number;
  downgrades: number;
  totalEstimatedSavings: number;
  configured: boolean;
  error?: string;
}

export interface SonarrSearchResult {
  success: boolean;
  commandId: number;
  status: string;
}

export interface SonarrRelease {
  guid: string;
  title: string;
  indexer: string;
  indexerId: number;
  size: number;
  age: number;
  ageHours: number;
  quality: string;
  qualityWeight: number;
  seeders: number;
  leechers: number;
  protocol: string;
  approved: boolean;
  rejected: boolean;
  rejections: string[];
  downloadUrl: string;
  infoUrl: string;
  languages: string[];
  customFormatScore: number;
  seasonNumber?: number;
  episodeNumbers?: number[];
  fullSeason?: boolean;
}

export interface SonarrReleasesResponse {
  releases: SonarrRelease[];
}

export interface SonarrDownloadResult {
  success: boolean;
  approved: boolean;
  rejected: boolean;
  rejections: string[];
}
