import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ShowsService, ShowQueryParams, EpisodeQueryParams, PlexService } from '@core/services';
import { TVShowListItem, EpisodeWithShow, Pagination, FilterState } from '@core/models';
import { FilterPanelComponent, FilterConfig } from '@shared/components/filter-panel/filter-panel.component';

type ViewMode = 'shows' | 'episodes';

@Component({
  selector: 'app-shows',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterPanelComponent],
  templateUrl: './shows.component.html'
})
export class ShowsComponent implements OnInit, OnDestroy {
  // View mode
  viewMode: ViewMode = 'shows';
  
  // Shows data
  shows: TVShowListItem[] = [];
  
  // Episodes data
  episodes: EpisodeWithShow[] = [];
  
  pagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  isLoading = true;
  
  // Filter state
  filters: FilterState = {};
  filterConfig: FilterConfig = {
    showResolution: true,
    showVideoCodec: true,
    showAudioCodec: true,
    showContainer: false,
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

  constructor(
    private showsService: ShowsService,
    private plexService: PlexService,
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
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFiltersFromParams(params: any): void {
    this.viewMode = params['view'] === 'episodes' ? 'episodes' : 'shows';
    this.searchQuery = params['search'] || '';
    this.filters = {
      resolution: params['resolution'] || undefined,
      videoCodec: params['videoCodec'] || undefined,
      audioCodec: params['audioCodec'] || undefined,
      minSize: params['minSize'] ? parseInt(params['minSize'], 10) : undefined,
      maxSize: params['maxSize'] ? parseInt(params['maxSize'], 10) : undefined
    };
    this.sortField = params['sort'] || (this.viewMode === 'episodes' ? 'media.fileSize' : 'title');
    this.sortOrder = params['order'] || (this.viewMode === 'episodes' ? 'desc' : 'asc');
    this.currentPage = params['page'] ? parseInt(params['page'], 10) : 1;
  }

  private updateUrlAndLoad(): void {
    const queryParams: any = {};
    
    if (this.viewMode === 'episodes') queryParams['view'] = 'episodes';
    if (this.searchQuery) queryParams['search'] = this.searchQuery;
    if (this.filters.resolution) queryParams['resolution'] = this.filters.resolution;
    if (this.filters.videoCodec) queryParams['videoCodec'] = this.filters.videoCodec;
    if (this.filters.audioCodec) queryParams['audioCodec'] = this.filters.audioCodec;
    if (this.filters.minSize) queryParams['minSize'] = this.filters.minSize;
    if (this.filters.maxSize) queryParams['maxSize'] = this.filters.maxSize;
    
    const defaultSort = this.viewMode === 'episodes' ? 'media.fileSize' : 'title';
    const defaultOrder = this.viewMode === 'episodes' ? 'desc' : 'asc';
    if (this.sortField !== defaultSort) queryParams['sort'] = this.sortField;
    if (this.sortOrder !== defaultOrder) queryParams['order'] = this.sortOrder;
    if (this.currentPage > 1) queryParams['page'] = this.currentPage;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  loadData(): void {
    if (this.viewMode === 'shows') {
      this.loadShows();
    } else {
      this.loadEpisodes();
    }
  }

  loadShows(): void {
    this.isLoading = true;
    
    const params: ShowQueryParams = {
      page: this.currentPage,
      limit: this.pagination.limit,
      sort: this.sortField,
      order: this.sortOrder,
      search: this.searchQuery || undefined,
      resolution: this.filters.resolution,
      videoCodec: this.filters.videoCodec,
      audioCodec: this.filters.audioCodec,
      minSize: this.filters.minSize,
      maxSize: this.filters.maxSize
    };

    this.showsService.getShows(params).subscribe({
      next: (response) => {
        this.shows = response.shows;
        this.pagination = response.pagination;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading shows:', error);
        this.isLoading = false;
      }
    });
  }

  loadEpisodes(): void {
    this.isLoading = true;
    
    const params: EpisodeQueryParams = {
      page: this.currentPage,
      limit: this.pagination.limit,
      sort: this.sortField,
      order: this.sortOrder,
      search: this.searchQuery || undefined,
      resolution: this.filters.resolution,
      videoCodec: this.filters.videoCodec,
      audioCodec: this.filters.audioCodec,
      minSize: this.filters.minSize,
      maxSize: this.filters.maxSize
    };

    this.showsService.getEpisodes(params).subscribe({
      next: (response) => {
        this.episodes = response.episodes;
        this.pagination = response.pagination;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading episodes:', error);
        this.isLoading = false;
      }
    });
  }

  onViewModeChange(mode: ViewMode): void {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      this.currentPage = 1;
      // Reset sort to default for each view
      this.sortField = mode === 'episodes' ? 'media.fileSize' : 'title';
      this.sortOrder = mode === 'episodes' ? 'desc' : 'asc';
      this.updateUrlAndLoad();
    }
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
      this.sortOrder = field === 'media.fileSize' ? 'desc' : 'asc';
    }
    this.updateUrlAndLoad();
  }

  onShowClick(show: TVShowListItem): void {
    this.router.navigate(['/shows', show.id]);
  }

  onEpisodeClick(episode: EpisodeWithShow): void {
    // Navigate to the show detail page
    this.router.navigate(['/shows', episode.showId]);
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
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
    return `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`;
  }

  getResolutionClass(resolution: string | undefined): string {
    switch (resolution) {
      case '4K': return 'bg-purple-600/20 text-purple-400';
      case '1080p': return 'bg-blue-600/20 text-blue-400';
      case '720p': return 'bg-green-600/20 text-green-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
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
