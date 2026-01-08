export interface RadarrConfig {
  host: string;
  enabled: boolean;
  isConnected: boolean;
  version: string | null;
  lastCheckedAt: string | null;
  maxMovieSize: number;
}

export interface RadarrTestResult {
  success: boolean;
  version?: string;
  appName?: string;
}

export interface RadarrMissingMovie {
  id: number;
  title: string;
  year: number;
  tmdbId?: number;
  imdbId?: string;
  monitored: boolean;
  qualityProfile: string;
  posterUrl: string | null;
  added?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  inCinemas?: string;
}

export interface RadarrUpcomingMovie {
  id: number;
  title: string;
  year: number;
  tmdbId?: number;
  imdbId?: string;
  monitored: boolean;
  qualityProfile: string;
  posterUrl: string | null;
  added?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  inCinemas?: string;
  status?: string;
}

export interface RadarrUpgradeMovie {
  id: number;
  title: string;
  year: number;
  monitored: boolean;
  currentQuality: string;
  targetQuality: string;
  qualityProfile: string;
  fileSize: number;
  posterUrl: string | null;
}

export interface RadarrDowngradeMovie {
  id: number;
  title: string;
  year: number;
  monitored: boolean;
  currentQuality: string;
  targetQuality: string;
  qualityProfile: string;
  fileSize: number;
  estimatedSavings: number;
  posterUrl: string | null;
  reason: 'quality' | 'size' | 'both';
}

export interface RadarrMissingResponse {
  movies: RadarrMissingMovie[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RadarrUpcomingResponse {
  movies: RadarrUpcomingMovie[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RadarrUpgradesResponse {
  movies: RadarrUpgradeMovie[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RadarrDowngradesResponse {
  movies: RadarrDowngradeMovie[];
  total: number;
  totalEstimatedSavings: number;
}

export interface RadarrStats {
  missing: number;
  upcoming: number;
  upgrades: number;
  downgrades: number;
  configured: boolean;
  error?: string;
}

export interface RadarrSearchResult {
  success: boolean;
  commandId: number;
  status: string;
}

export interface RadarrRelease {
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
}

export interface RadarrReleasesResponse {
  releases: RadarrRelease[];
}

export interface RadarrDownloadResult {
  success: boolean;
  approved: boolean;
  rejected: boolean;
  rejections: string[];
}
