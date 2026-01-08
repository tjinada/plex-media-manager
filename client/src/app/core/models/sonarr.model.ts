export interface SonarrConfig {
  host: string;
  enabled: boolean;
  isConnected: boolean;
  version: string | null;
  lastCheckedAt: string | null;
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
}

export interface SonarrMissingResponse {
  episodes: SonarrMissingEpisode[];
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
