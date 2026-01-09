import { Pagination } from './movie.model';

export interface WatchHistorySummary {
  neverWatched: number;
  staleOneYear: number;
  staleSixMonths: number;
  active: number;
  totalItems: number;
  totalSize: number;
  staleSize: number;
}

export interface WatchHistoryAnalysis {
  summary: {
    movies: WatchHistorySummary;
    episodes: WatchHistorySummary;
    total: WatchHistorySummary;
  };
  staleThresholdDays: number;
  analyzedAt: string;
}

export interface StaleMovie {
  id: string;
  plexId: string;
  title: string;
  year: number;
  addedAt: string;
  lastViewedAt: string | null;
  viewCount: number;
  fileSize: number;
  resolution: string;
  videoCodec: string;
  filePath: string;
  posterUrl: string;
  status: 'never' | 'stale' | 'active';
}

export interface StaleEpisode {
  id: string;
  plexId: string;
  title: string;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  addedAt: string;
  lastViewedAt: string | null;
  viewCount: number;
  fileSize: number;
  resolution: string;
  videoCodec: string;
  filePath: string;
  thumbUrl: string;
  status: 'never' | 'stale' | 'active';
}

export interface StaleShow {
  showId: string;
  title: string;
  year: number;
  posterUrl: string;
  totalEpisodes: number;
  neverWatched: number;
  staleEpisodes: number;
  activeEpisodes: number;
  totalSize: number;
  staleSize: number;
  unwatchedCount: number;
  activePercentage: number;
  stalePercentage: number;
}

export interface StaleMoviesResponse {
  items: StaleMovie[];
  pagination: Pagination;
}

export interface StaleEpisodesResponse {
  items: StaleEpisode[];
  pagination: Pagination;
}

export interface StaleShowsResponse {
  items: StaleShow[];
  pagination: Pagination;
}
