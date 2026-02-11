import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompatibilityService } from '@core/services';
import {
  CompatibilityAnalysis,
  CompatibilityIssue,
  CompatibilityRule,
  Pagination,
  SearchResult,
  MovieSearchResponse,
  EpisodeSearchResponse
} from '@core/models';

@Component({
  selector: 'app-compatibility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compatibility.component.html'
})
export class CompatibilityComponent implements OnInit {
  Math = Math;
  isLoading = true;
  analysis: CompatibilityAnalysis | null = null;
  rules: CompatibilityRule[] = [];
  
  // Filter state
  typeFilter: 'all' | 'movies' | 'episodes' = 'all';
  severityFilter: 'all' | 'high' | 'medium' | 'low' = 'all';
  ruleFilter: string | null = null;
  sortBy: 'severity' | 'fileSize' | 'title' = 'severity';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Issues list
  issues: CompatibilityIssue[] = [];
  pagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  issuesLoading = false;

  // Search modal state
  showSearchModal = false;
  searchLoading = false;
  searchError: string | null = null;
  searchResults: SearchResult[] = [];
  searchItem: CompatibilityIssue | null = null;
  searchExternalUrl: string | null = null;
  downloadingGuid: string | null = null;
  downloadedGuids: Set<string> = new Set();

  constructor(private compatibilityService: CompatibilityService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    this.compatibilityService.getRules().subscribe({
      next: (response) => {
        this.rules = response.rules;
      }
    });
    
    this.compatibilityService.getAnalysis().subscribe({
      next: (analysis) => {
        this.analysis = analysis;
        this.isLoading = false;
        this.loadIssues();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadIssues(): void {
    this.issuesLoading = true;
    this.compatibilityService.getIssues({
      type: this.typeFilter,
      severity: this.severityFilter,
      ruleId: this.ruleFilter,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      page: this.pagination.page,
      limit: this.pagination.limit
    }).subscribe({
      next: (response) => {
        this.issues = response.items;
        this.pagination = response.pagination;
        this.issuesLoading = false;
      },
      error: () => {
        this.issuesLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.pagination.page = 1;
    this.loadIssues();
  }

  goToPage(page: number): void {
    this.pagination.page = page;
    this.loadIssues();
  }

  // Search modal methods
  openSearch(issue: CompatibilityIssue): void {
    this.searchItem = issue;
    this.searchResults = [];
    this.searchError = null;
    this.showSearchModal = true;
    this.searchLoading = true;

    if (issue.itemType === 'movie') {
      this.compatibilityService.searchMovie(issue.itemId).subscribe({
        next: (response: MovieSearchResponse) => {
          this.searchResults = this.sortResultsByScore(response.results);
          this.searchExternalUrl = response.radarrUrl;
          this.searchLoading = false;
        },
        error: (err) => {
          this.searchError = err.error?.error || err.error?.suggestion || 'Failed to search';
          this.searchLoading = false;
        }
      });
    } else {
      this.compatibilityService.searchEpisode(issue.itemId).subscribe({
        next: (response: EpisodeSearchResponse) => {
          this.searchResults = this.sortResultsByScore(response.results);
          this.searchExternalUrl = response.sonarrUrl;
          this.searchLoading = false;
        },
        error: (err) => {
          this.searchError = err.error?.error || err.error?.suggestion || 'Failed to search';
          this.searchLoading = false;
        }
      });
    }
  }

  closeSearch(): void {
    this.showSearchModal = false;
    this.searchItem = null;
    this.searchResults = [];
    this.searchError = null;
    this.searchExternalUrl = null;
    this.downloadedGuids.clear();
  }

  downloadRelease(result: SearchResult): void {
    if (!this.searchItem) return;
    
    this.downloadingGuid = result.guid;
    
    const download$ = this.searchItem.itemType === 'movie'
      ? this.compatibilityService.downloadMovieRelease(result.guid, result.indexerId)
      : this.compatibilityService.downloadEpisodeRelease(result.guid, result.indexerId);

    download$.subscribe({
      next: () => {
        this.downloadingGuid = null;
        this.downloadedGuids.add(result.guid);
      },
      error: (err) => {
        this.downloadingGuid = null;
        alert(err.error?.error || 'Failed to download');
      }
    });
  }

  openExternalUrl(): void {
    if (this.searchExternalUrl) {
      window.open(this.searchExternalUrl, '_blank');
    }
  }

  getSearchTitle(): string {
    if (!this.searchItem) return '';
    
    if (this.searchItem.itemType === 'movie') {
      return `${this.searchItem.title} (${this.searchItem.year})`;
    } else {
      return `${this.searchItem.showTitle} - ${this.formatEpisodeCode(this.searchItem.seasonNumber!, this.searchItem.episodeNumber!)}`;
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
    return `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`;
  }

  isDownloaded(guid: string): boolean {
    return this.downloadedGuids.has(guid);
  }

  private sortResultsByScore(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => (b.qualityWeight || 0) - (a.qualityWeight || 0));
  }

  formatAge(age: number): string {
    if (age === 0) return 'Today';
    if (age === 1) return '1 day';
    if (age < 30) return `${age} days`;
    if (age < 365) return `${Math.floor(age / 30)} months`;
    return `${Math.floor(age / 365)} years`;
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-orange-400';
      case 'low': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }

  getSeverityBadge(severity: string): string {
    switch (severity) {
      case 'high': return 'bg-red-600/20 text-red-400';
      case 'medium': return 'bg-orange-600/20 text-orange-400';
      case 'low': return 'bg-yellow-600/20 text-yellow-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'high': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'medium': return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'low': return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'hdr': return 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z';
      case 'audio': return 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z';
      case 'video': return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
      case 'bandwidth': return 'M13 10V3L4 14h7v7l9-11h-7z';
      default: return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getRuleIssues(): { id: string; name: string; count: number; size: number; severity: string }[] {
    if (!this.analysis) return [];
    
    return Object.entries(this.analysis.summary.byRule)
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        size: data.size,
        severity: data.severity
      }))
      .sort((a, b) => b.count - a.count);
  }
}
