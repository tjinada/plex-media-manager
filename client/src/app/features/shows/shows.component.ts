import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShowsService, ShowQueryParams, PlexService } from '@core/services';
import { TVShowListItem, Pagination } from '@core/models';

@Component({
  selector: 'app-shows',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shows.component.html'
})
export class ShowsComponent implements OnInit {
  shows: TVShowListItem[] = [];
  pagination: Pagination = { page: 1, limit: 50, total: 0, totalPages: 0 };
  isLoading = true;
  
  // Query params
  searchQuery = '';
  currentPage = 1;
  sortField = 'title';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor(
    private showsService: ShowsService,
    private plexService: PlexService
  ) {}

  ngOnInit(): void {
    this.loadShows();
  }

  loadShows(): void {
    this.isLoading = true;
    
    const params: ShowQueryParams = {
      page: this.currentPage,
      limit: this.pagination.limit,
      sort: this.sortField,
      order: this.sortOrder,
      search: this.searchQuery || undefined
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

  onSearch(): void {
    this.currentPage = 1;
    this.loadShows();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadShows();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.loadShows();
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
