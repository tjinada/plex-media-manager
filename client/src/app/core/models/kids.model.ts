export type KidsSourceType = 'movie' | 'show';

export interface KidsMapping {
  sourceSectionId: string;
  sourceType: KidsSourceType;
  kidsSectionId: string;
  farmPath: string;
}

export interface KidsConfig {
  enabled: boolean;
  label: string;
  quarantinePath: string;
  maxRemovalsPerRun: number;
  mappings: KidsMapping[];
  lastRunAt: string | null;
  lastRunSummary: ReconcileSummary | null;
}

export interface KidsConfigResponse {
  configured: boolean;
  config: KidsConfig | null;
}

export interface PlexSection {
  id: string;
  title: string;
  type: KidsSourceType;
  locations: string[];
}

export interface ReconcileResult {
  section?: string;
  type: KidsSourceType;
  labelled?: number;
  linked?: number;
  added?: number;
  quarantined?: number;
  broken?: { name: string; target: string }[];
  skipped?: { title: string; reason: string }[];
  foreign?: string[];
  aborted?: boolean;
  abortReason?: string;
  wouldAdd?: string[];
  wouldQuarantine?: string[];
  error?: string;
}

export interface ReconcileSummary {
  dryRun: boolean;
  results: ReconcileResult[];
  at: string;
  skipped?: boolean;
  reason?: string;
}

export interface QuarantineBucket {
  type: KidsSourceType;
  farmPath: string;
  items: { name: string; fullPath: string }[];
}
