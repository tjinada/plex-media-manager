import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchHistoryService } from '@core/services';
import { 
  WatchHistoryAnalysis, 
  StaleMovie, 
  StaleEpisode,
  StaleShow,
  Pagination 
} from '@core/models';

@Component({
  selector: 'app-watch-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watch-history.component.html'
})
export class WatchHistoryComponent implements OnInit {
  Math = Math; // For template access
  isLoading = true;
  analysis: WatchHistoryAnalysis | null = null;
  
  // Tab state
  activeTab: 'movies' | 'episodes' | 'shows' = 'movies';
  
  // Filter state
  staleThresholdDays = 365;
  thresholdOptions = [
    { label: '6 months', value: 180 },
    { label: '1 year', value: 365 },
    { label: '2 years', value: 730 },
    { label: '3 years', value: 1095 }
  ];
  filter: 'all' | 'never' | 'stale' = 'all';
  sortBy = 'fileSize';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Movies state
  movies: StaleMovie[] = [];
  moviesPagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  moviesLoading = false;
  
  // Episodes state
  episodes: StaleEpisode[] = [];
  episodesPagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  episodesLoading = false;
  
  // Shows state
  shows: StaleShow[] = [];
  showsPagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  showsLoading = false;

  constructor(private watchHistoryService: WatchHistoryService) {}

  ngOnInit(): void {
    this.loadAnalysis();
    this.loadMovies();
  }

  loadAnalysis(): void {
    this.watchHistoryService.getAnalysis({ staleThresholdDays: this.staleThresholdDays }).subscribe({
      next: (analysis) => {
        this.analysis = analysis;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onThresholdChange(): void {
    this.loadAnalysis();
    this.resetAndLoad();
  }

  onFilterChange(): void {
    this.resetAndLoad();
  }

  resetAndLoad(): void {
    this.moviesPagination.page = 1;
    this.episodesPagination.page = 1;
    this.showsPagination.page = 1;
    
    if (this.activeTab === 'movies') {
      this.loadMovies();
    } else if (this.activeTab === 'episodes') {
      this.loadEpisodes();
    } else {
      this.loadShows();
    }
  }

  setActiveTab(tab: 'movies' | 'episodes' | 'shows'): void {
    this.activeTab = tab;
    if (tab === 'movies' && this.movies.length === 0) {
      this.loadMovies();
    } else if (tab === 'episodes' && this.episodes.length === 0) {
      this.loadEpisodes();
    } else if (tab === 'shows' && this.shows.length === 0) {
      this.loadShows();
    }
  }

  loadMovies(): void {
    this.moviesLoading = true;
    this.watchHistoryService.getStaleMovies({
      staleThresholdDays: this.staleThresholdDays,
      filter: this.filter,
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

  loadEpisodes(): void {
    this.episodesLoading = true;
    this.watchHistoryService.getStaleEpisodes({
      staleThresholdDays: this.staleThresholdDays,
      filter: this.filter,
      sortBy: this.sortBy as any,
      sortOrder: this.sortOrder,
      page: this.episodesPagination.page,
      limit: this.episodesPagination.limit
    }).subscribe({
      next: (response) => {
        this.episodes = response.items;
        this.episodesPagination = response.pagination;
        this.episodesLoading = false;
      },
      error: () => {
        this.episodesLoading = false;
      }
    });
  }

  loadShows(): void {
    this.showsLoading = true;
    this.watchHistoryService.getStaleShows({
      staleThresholdDays: this.staleThresholdDays,
      sortBy: 'staleEpisodes',
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

  goToPage(page: number): void {
    if (this.activeTab === 'movies') {
      this.moviesPagination.page = page;
      this.loadMovies();
    } else if (this.activeTab === 'episodes') {
      this.episodesPagination.page = page;
      this.loadEpisodes();
    } else {
      this.showsPagination.page = page;
      this.loadShows();
    }
  }

  getCurrentPagination(): Pagination {
    if (this.activeTab === 'movies') return this.moviesPagination;
    if (this.activeTab === 'episodes') return this.episodesPagination;
    return this.showsPagination;
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
    return `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'never': return 'text-red-400';
      case 'stale': return 'text-orange-400';
      default: return 'text-green-400';
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'never': return 'bg-red-600/20 text-red-400';
      case 'stale': return 'bg-orange-600/20 text-orange-400';
      default: return 'bg-green-600/20 text-green-400';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'never': return 'Never Watched';
      case 'stale': return 'Stale';
      default: return 'Active';
    }
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
}
