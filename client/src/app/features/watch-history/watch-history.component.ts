import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchHistoryService, CompatibilityService } from '@core/services';
import {
  WatchHistoryAnalysis,
  StaleMovie,
  StaleEpisode,
  StaleShow,
  Pagination,
  SearchResult,
  MovieSearchResponse,
  EpisodeSearchResponse
} from '@core/models';

@Component({
  selector: 'app-watch-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watch-history.component.html'
})
export class WatchHistoryComponent implements OnInit {
  Math = Math;
  isLoading = true;
  analysis: WatchHistoryAnalysis | null = null;
  
  // Tab state: 'movies' or 'shows'
  activeTab: 'movies' | 'shows' = 'movies';
  
  // Threshold options
  staleThreshold = 730; // 2 years default
  thresholdOptions = [
    { label: '6 months', value: 180 },
    { label: '1 year', value: 365 },
    { label: '2 years', value: 730 },
    { label: '3 years', value: 1095 }
  ];
  
  // Filter: all, never, stale, active
  statusFilter: 'all' | 'never' | 'stale' | 'active' = 'all';
  
  // Sort
  sortBy = 'fileSize';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Movies data
  movies: StaleMovie[] = [];
  moviesPagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  moviesLoading = false;
  
  // Episodes data
  episodes: StaleEpisode[] = [];
  episodesPagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  episodesLoading = false;
  
  // Shows data
  shows: StaleShow[] = [];
  showsPagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  showsLoading = false;

  // Search modal state
  showSearchModal = false;
  searchLoading = false;
  searchError: string | null = null;
  searchResults: SearchResult[] = [];
  searchTitle = '';
  searchItemType: 'movie' | 'episode' = 'movie';
  searchExternalUrl: string | null = null;
  downloadingGuid: string | null = null;
  downloadedGuids: Set<string> = new Set();

  constructor(
    private watchHistoryService: WatchHistoryService,
    private compatibilityService: CompatibilityService
  ) {}

  ngOnInit(): void {
    this.loadAnalysis();
  }

  loadAnalysis(): void {
    this.isLoading = true;
    this.watchHistoryService.getAnalysis({
      staleThresholdDays: this.staleThreshold
    }).subscribe({
      next: (analysis) => {
        this.analysis = analysis;
        this.isLoading = false;
        // Load initial data based on active tab
        if (this.activeTab === 'movies') {
          this.loadMovies();
        } else {
          this.loadShows();
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadMovies(): void {
    this.moviesLoading = true;
    this.watchHistoryService.getMovies({
      staleThresholdDays: this.staleThreshold,
      filter: this.statusFilter,
      sortBy: this.sortBy as any,
      sortOrder: this.sortOrder,
      page: this.moviesPagination.page,
      limit: this.moviesPagination.limit
    }).subscribe({
      next: (response) => {
        this.movies = response.items;
        this.moviesPagination = response.pagination;
        this.moviesLoading = false;
      },
      error: () => {
        this.moviesLoading = false;
      }
    });
  }

  loadShows(): void {
    this.showsLoading = true;
    const showSortBy = this.sortBy === 'fileSize' ? 'staleSize' : 
                       this.sortBy === 'title' ? 'title' : 'staleEpisodes';
    
    this.watchHistoryService.getShows({
      staleThresholdDays: this.staleThreshold,
      filter: this.statusFilter,
      sortBy: showSortBy as any,
      sortOrder: this.sortOrder,
      page: this.showsPagination.page,
      limit: this.showsPagination.limit
    }).subscribe({
      next: (response) => {
        this.shows = response.items;
        this.showsPagination = response.pagination;
        this.showsLoading = false;
      },
      error: () => {
        this.showsLoading = false;
      }
    });
  }

  onTabChange(tab: 'movies' | 'shows'): void {
    this.activeTab = tab;
    this.statusFilter = 'all';
    this.sortBy = 'fileSize';
    
    if (tab === 'movies') {
      this.moviesPagination.page = 1;
      this.loadMovies();
    } else {
      this.showsPagination.page = 1;
      this.loadShows();
    }
  }

  onThresholdChange(): void {
    this.loadAnalysis();
  }

  onFilterChange(): void {
    if (this.activeTab === 'movies') {
      this.moviesPagination.page = 1;
      this.loadMovies();
    } else {
      this.showsPagination.page = 1;
      this.loadShows();
    }
  }

  goToPage(page: number): void {
    if (this.activeTab === 'movies') {
      this.moviesPagination.page = page;
      this.loadMovies();
    } else {
      this.showsPagination.page = page;
      this.loadShows();
    }
  }

  getCurrentPagination(): Pagination {
    return this.activeTab === 'movies' ? this.moviesPagination : this.showsPagination;
  }

  isTabLoading(): boolean {
    return this.activeTab === 'movies' ? this.moviesLoading : this.showsLoading;
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
    return `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`;
  }

  getStatusBadge(status: string): { class: string; label: string } {
    switch (status) {
      case 'active':
        return { class: 'bg-green-600/20 text-green-400', label: 'Active' };
      case 'stale':
        return { class: 'bg-orange-600/20 text-orange-400', label: 'Stale' };
      case 'never':
        return { class: 'bg-red-600/20 text-red-400', label: 'Never Watched' };
      default:
        return { class: 'bg-gray-600/20 text-gray-400', label: status };
    }
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  // For summary cards - calculate based on selected threshold
  getMoviesSummary() {
    if (!this.analysis) return { active: 0, stale: 0, never: 0, total: 0 };
    const m = this.analysis.summary.movies;
    return {
      active: m.active,
      stale: m.staleOneYear,
      never: m.neverWatched,
      total: m.totalItems
    };
  }

  getEpisodesSummary() {
    if (!this.analysis) return { active: 0, stale: 0, never: 0, total: 0 };
    const e = this.analysis.summary.episodes;
    return {
      active: e.active,
      stale: e.staleOneYear,
      never: e.neverWatched,
      total: e.totalItems
    };
  }

  // ===== Interactive Search Modal Methods =====

  openMovieSearch(movie: StaleMovie): void {
    this.searchTitle = `${movie.title} (${movie.year})`;
    this.searchItemType = 'movie';
    this.searchResults = [];
    this.searchError = null;
    this.searchExternalUrl = null;
    this.showSearchModal = true;
    this.searchLoading = true;

    this.compatibilityService.searchMovie(movie.id).subscribe({
      next: (response: MovieSearchResponse) => {
        this.searchResults = this.sortReleasesByScore(response.results);
        this.searchExternalUrl = response.radarrUrl;
        this.searchLoading = false;
      },
      error: (err) => {
        this.searchError = err.error?.error || err.error?.suggestion || 'Failed to search. Make sure the movie is in Radarr.';
        this.searchLoading = false;
      }
    });
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    this.searchResults = [];
    this.searchError = null;
    this.searchExternalUrl = null;
    this.downloadedGuids.clear();
  }

  downloadRelease(result: SearchResult): void {
    this.downloadingGuid = result.guid;

    const download$ = this.searchItemType === 'movie'
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

  isDownloaded(guid: string): boolean {
    return this.downloadedGuids.has(guid);
  }

  formatAge(age: number): string {
    if (age === 0) return 'Today';
    if (age === 1) return '1 day';
    if (age < 30) return `${age} days`;
    if (age < 365) return `${Math.floor(age / 30)} months`;
    return `${Math.floor(age / 365)} years`;
  }

  private sortReleasesByScore(releases: SearchResult[]): SearchResult[] {
    return [...releases].sort((a, b) => (b.customFormatScore || 0) - (a.customFormatScore || 0));
  }
}
