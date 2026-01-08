export interface RadarrConfig {
  host: string;
  enabled: boolean;
  isConnected: boolean;
  version: string | null;
  lastCheckedAt: string | null;
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
}

export interface RadarrMissingResponse {
  movies: RadarrMissingMovie[];
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
}

export interface RadarrStats {
  missing: number;
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
