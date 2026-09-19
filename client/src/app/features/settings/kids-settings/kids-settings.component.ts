import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { KidsService } from '@core/services';
import {
  KidsMapping,
  KidsSourceType,
  PlexSection,
  QuarantineBucket,
  ReconcileSummary
} from '@core/models';

interface MappingRow {
  type: KidsSourceType;
  label: string;
  sourceSectionId: string;
  kidsSectionId: string;
  farmPath: string;
}

const DEFAULT_ROWS: MappingRow[] = [
  { type: 'movie', label: 'Movies', sourceSectionId: '', kidsSectionId: '', farmPath: '/media/kids-movies' },
  { type: 'show', label: 'TV Shows', sourceSectionId: '', kidsSectionId: '', farmPath: '/media/kids-tv' }
];

/**
 * Kids library settings: section mappings, manual reconcile, last run and
 * quarantine review. Kept separate from SettingsComponent, which is already
 * large and owns unrelated integrations.
 */
@Component({
  selector: 'app-kids-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kids-settings.component.html'
})
export class KidsSettingsComponent implements OnInit {
  private kidsService = inject(KidsService);

  isLoading = true;
  loadError: string | null = null;

  enabled = false;
  maxRemovalsPerRun = 10;
  rows: MappingRow[] = DEFAULT_ROWS.map(row => ({ ...row }));
  sections: PlexSection[] = [];

  saving = false;
  saveError: string | null = null;
  saved = false;

  running: 'dry' | 'real' | null = null;
  runError: string | null = null;
  lastRun: ReconcileSummary | null = null;

  quarantine: QuarantineBucket[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.loadError = null;

    forkJoin({
      config: this.kidsService.getConfig(),
      sections: this.kidsService.getSections(),
      quarantine: this.kidsService.getQuarantine()
    }).subscribe({
      next: ({ config, sections, quarantine }) => {
        this.sections = sections;
        this.quarantine = quarantine;

        const cfg = config.config;
        if (cfg) {
          this.enabled = cfg.enabled;
          this.maxRemovalsPerRun = cfg.maxRemovalsPerRun;
          this.lastRun = cfg.lastRunSummary;
          this.rows = DEFAULT_ROWS.map(row => {
            const saved = cfg.mappings.find(m => m.sourceType === row.type);
            return saved ? { ...row, ...saved } : { ...row };
          });
        }

        this.isLoading = false;
      },
      error: err => {
        this.loadError = err.error?.error || 'Failed to load kids settings';
        this.isLoading = false;
      }
    });
  }

  sectionsOfType(type: KidsSourceType): PlexSection[] {
    return this.sections.filter(section => section.type === type);
  }

  /** A row is saved only when both sections are chosen and they differ. */
  private rowError(row: MappingRow): string | null {
    const partial = !!row.sourceSectionId !== !!row.kidsSectionId;
    if (partial) return `${row.label}: choose both a source and a kids library`;
    if (row.sourceSectionId && row.sourceSectionId === row.kidsSectionId) {
      return `${row.label}: source and kids library must be different`;
    }
    if (row.sourceSectionId && !row.farmPath.trim()) {
      return `${row.label}: farm path is required`;
    }
    return null;
  }

  save(): void {
    this.saveError = this.rows.map(row => this.rowError(row)).find(Boolean) || null;
    if (this.saveError) return;

    const mappings: KidsMapping[] = this.rows
      .filter(row => row.sourceSectionId && row.kidsSectionId)
      .map(row => ({
        sourceSectionId: row.sourceSectionId,
        sourceType: row.type,
        kidsSectionId: row.kidsSectionId,
        farmPath: row.farmPath.trim()
      }));

    this.saving = true;
    this.saved = false;

    this.kidsService
      .saveConfig({ enabled: this.enabled, mappings, maxRemovalsPerRun: this.maxRemovalsPerRun })
      .subscribe({
        next: () => {
          this.saving = false;
          this.saved = true;
        },
        error: err => {
          this.saving = false;
          this.saveError = err.error?.error || 'Failed to save kids settings';
        }
      });
  }

  run(dryRun: boolean): void {
    this.running = dryRun ? 'dry' : 'real';
    this.runError = null;

    this.kidsService.reconcile(dryRun).subscribe({
      next: summary => {
        this.running = null;
        if (summary.skipped) {
          this.runError = summary.reason || 'Kids sync is not configured or is disabled';
          return;
        }
        this.lastRun = summary;
        if (!dryRun) this.refreshQuarantine();
      },
      error: err => {
        this.running = null;
        this.runError = err.error?.error || 'Reconcile failed';
      }
    });
  }

  private refreshQuarantine(): void {
    this.kidsService.getQuarantine().subscribe({
      next: buckets => (this.quarantine = buckets)
    });
  }

  typeLabel(type: KidsSourceType): string {
    return type === 'show' ? 'TV Shows' : 'Movies';
  }

  get quarantineCount(): number {
    return this.quarantine.reduce((total, bucket) => total + bucket.items.length, 0);
  }

  displayName(quarantinedName: string): string {
    return quarantinedName.replace(/__[\dTZ-]+$/, '');
  }
}
