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
