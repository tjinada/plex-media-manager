import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MoviesService, MovieQueryParams, PlexService, CompatibilityService } from '@core/services';
import { MovieListItem, Pagination, FilterState, SearchResult, MovieSearchResponse } from '@core/models';
import { FilterPanelComponent, FilterConfig } from '@shared/components/filter-panel/filter-panel.component';

@Component({
  selector: 'app-movies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterPanelComponent],
  templateUrl: './movies.component.html'
})
export class MoviesComponent implements OnInit, OnDestroy {
  movies: MovieListItem[] = [];
  pagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  isLoading = true;
  
  // Filter state
  filters: FilterState = {};
  filterConfig: FilterConfig = {
    showResolution: true,
    showVideoCodec: true,
    showAudioCodec: true,
    showContainer: true,
    showFileSize: true
  };

  // Search with debounce
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Sorting and pagination
  currentPage = 1;
  sortField = 'title';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Search modal state
  showSearchModal = false;
  searchLoading = false;
  searchError: string | null = null;
  searchResults: SearchResult[] = [];
  searchMovie: MovieListItem | null = null;
  searchExternalUrl: string | null = null;
  downloadingGuid: string | null = null;
  downloadedGuids: Set<string> = new Set();

  constructor(
    private moviesService: MoviesService,
    private plexService: PlexService,
    private compatibilityService: CompatibilityService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.currentPage = 1;
      this.updateUrlAndLoad();
    });

    // Load filters from URL query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.loadFiltersFromParams(params);
      this.loadMovies();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFiltersFromParams(params: any): void {
    this.searchQuery = params['search'] || '';
    this.filters = {
      resolution: params['resolution'] || undefined,
      videoCodec: params['videoCodec'] || undefined,
      audioCodec: params['audioCodec'] || undefined,
      container: params['container'] || undefined,
      minSize: params['minSize'] ? parseInt(params['minSize'], 10) : undefined,
      maxSize: params['maxSize'] ? parseInt(params['maxSize'], 10) : undefined
    };
    this.sortField = params['sort'] || 'title';
    this.sortOrder = params['order'] || 'asc';
    this.currentPage = params['page'] ? parseInt(params['page'], 10) : 1;
  }

  private updateUrlAndLoad(): void {
    const queryParams: any = {};
    
    if (this.searchQuery) queryParams['search'] = this.searchQuery;
    if (this.filters.resolution) queryParams['resolution'] = this.filters.resolution;
    if (this.filters.videoCodec) queryParams['videoCodec'] = this.filters.videoCodec;
    if (this.filters.audioCodec) queryParams['audioCodec'] = this.filters.audioCodec;
    if (this.filters.container) queryParams['container'] = this.filters.container;
    if (this.filters.minSize) queryParams['minSize'] = this.filters.minSize;
    if (this.filters.maxSize) queryParams['maxSize'] = this.filters.maxSize;
    if (this.sortField !== 'title') queryParams['sort'] = this.sortField;
    if (this.sortOrder !== 'asc') queryParams['order'] = this.sortOrder;
    if (this.currentPage > 1) queryParams['page'] = this.currentPage;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  loadMovies(): void {
    this.isLoading = true;
    
    const params: MovieQueryParams = {
      page: this.currentPage,
      limit: this.pagination.limit,
      sort: this.sortField,
      order: this.sortOrder,
      search: this.searchQuery || undefined,
      resolution: this.filters.resolution,
      videoCodec: this.filters.videoCodec,
      audioCodec: this.filters.audioCodec,
      container: this.filters.container,
      minSize: this.filters.minSize,
      maxSize: this.filters.maxSize
    };

    this.moviesService.getMovies(params).subscribe({
      next: (response) => {
        this.movies = response.movies;
        this.pagination = response.pagination;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading movies:', error);
        this.isLoading = false;
      }
    });
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  onFiltersChange(newFilters: FilterState): void {
    this.filters = newFilters;
    this.currentPage = 1;
    this.updateUrlAndLoad();
  }

  onClearFilters(): void {
    this.filters = {};
    this.searchQuery = '';
    this.currentPage = 1;
    this.updateUrlAndLoad();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateUrlAndLoad();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.updateUrlAndLoad();
  }

  onMovieClick(movie: MovieListItem): void {
    this.router.navigate(['/movies', movie.id]);
  }

  getImageUrl(path: string | undefined): string {
    return this.plexService.getImageUrl(path);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = '/assets/images/placeholder-poster.svg';
    }
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '-';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  formatDuration(ms: number | undefined): string {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  getResolutionClass(resolution: string | undefined): string {
    switch (resolution) {
      case '4K': return 'bg-purple-600/20 text-purple-400';
      case '1080p': return 'bg-blue-600/20 text-blue-400';
      case '720p': return 'bg-green-600/20 text-green-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  }

  // ===== Interactive Search Modal Methods =====

  openSearch(movie: MovieListItem, event: Event): void {
    event.stopPropagation();
    this.searchMovie = movie;
    this.searchResults = [];
    this.searchError = null;
    this.showSearchModal = true;
    this.searchLoading = true;

    this.compatibilityService.searchMovie(movie.id).subscribe({
      next: (response: MovieSearchResponse) => {
        this.searchResults = response.results;
        this.searchExternalUrl = response.radarrUrl;
        this.searchLoading = false;
      },
      error: (err) => {
        this.searchError = err.error?.error || err.error?.suggestion || 'Failed to search. Make sure the movie is in Radarr.';
        this.searchLoading = false;
      }
    });
  }

  closeSearch(): void {
    this.showSearchModal = false;
    this.searchMovie = null;
    this.searchResults = [];
    this.searchError = null;
    this.searchExternalUrl = null;
    this.downloadedGuids.clear();
  }

  downloadRelease(result: SearchResult, event: Event): void {
    event.stopPropagation();
    if (!this.searchMovie) return;
    
    this.downloadingGuid = result.guid;
    
    this.compatibilityService.downloadMovieRelease(result.guid, result.indexerId).subscribe({
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
    if (!this.searchMovie) return '';
    return `${this.searchMovie.title} (${this.searchMovie.year})`;
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

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.pagination.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
