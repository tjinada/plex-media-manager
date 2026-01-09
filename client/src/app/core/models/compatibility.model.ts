import { Pagination } from './movie.model';

export interface CompatibilityRule {
  id: string;
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  enabled: boolean;
}

export interface RuleCount {
  count: number;
  size: number;
  name: string;
  severity: string;
}

export interface CompatibilitySummary {
  totalIssues: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  affectedMovies: number;
  affectedEpisodes: number;
  affectedSize: number;
  byRule: Record<string, RuleCount>;
}

export interface CompatibilityAnalysis {
  summary: CompatibilitySummary;
  analyzedAt: string;
}

export interface CompatibilityIssue {
  itemId: string;
  itemType: 'movie' | 'episode';
  title: string;
  year?: number;
  showTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  ruleId: string;
  ruleName: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  details: string;
  fileSize: number;
  filePath: string;
  resolution: string;
  videoCodec: string;
}

export interface CompatibilityIssuesResponse {
  items: CompatibilityIssue[];
  pagination: Pagination;
}

export interface CompatibilityRulesResponse {
  rules: CompatibilityRule[];
}

export interface SearchResult {
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
  // Sonarr specific
  seasonNumber?: number;
  episodeNumbers?: number[];
  fullSeason?: boolean;
}

export interface MovieSearchResponse {
  movie: {
    title: string;
    year: number;
    radarrId: number;
  };
  radarrUrl: string;
  results: SearchResult[];
}

export interface EpisodeSearchResponse {
  episode: {
    showTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    sonarrSeriesId: number;
    sonarrEpisodeId: number;
  };
  sonarrUrl: string;
  results: SearchResult[];
}
