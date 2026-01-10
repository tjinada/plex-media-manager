import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatsService } from '@core/services';
import { StorageStats, TopMovie, TopEpisode, ShowStorage } from '@core/models';

type SortField = 'title' | 'fileSize' | 'resolution' | 'videoCodec';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './storage.component.html'
})
export class StorageComponent implements OnInit {
  isLoading = true;
  
  topMovies: TopMovie[] = [];
  topEpisodes: TopEpisode[] = [];
  byShow: ShowStorage[] = [];
  
  storageByType = { movies: 0, episodes: 0 };
  storageByResolution: Record<string, number> = {};

  movieSortField: SortField = 'fileSize';
  movieSortOrder: SortOrder = 'desc';
  episodeSortField: SortField = 'fileSize';
  episodeSortOrder: SortOrder = 'desc';

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.statsService.getStorageStats().subscribe({
      next: (data: StorageStats) => {
        this.topMovies = data.topMovies;
        this.topEpisodes = data.topEpisodes;
        this.byShow = data.byShow;
        this.storageByType = data.byType;
        this.storageByResolution = data.byResolution;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  sortMovies(field: SortField): void {
    if (this.movieSortField === field) {
      this.movieSortOrder = this.movieSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.movieSortField = field;
      this.movieSortOrder = 'desc';
    }
    this.topMovies = this.sortArray(this.topMovies, field, this.movieSortOrder);
  }

  sortEpisodes(field: SortField): void {
    if (this.episodeSortField === field) {
      this.episodeSortOrder = this.episodeSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.episodeSortField = field;
      this.episodeSortOrder = 'desc';
    }
    this.topEpisodes = this.sortArray(this.topEpisodes, field, this.episodeSortOrder);
  }

  private sortArray<T>(arr: T[], field: SortField, order: SortOrder): T[] {
    return [...arr].sort((a: any, b: any) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (typeof aVal === 'string') {
        return order === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  getSortIcon(currentField: SortField, sortField: SortField, sortOrder: SortOrder): string {
    if (currentField !== sortField) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
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

  getResolutionKeys(): string[] {
    return Object.keys(this.storageByResolution).sort((a, b) => {
      const order = ['4K', '1080p', '720p', '480p', 'SD', 'Unknown'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }

  getResolutionPercentage(resolution: string): number {
    const total = Object.values(this.storageByResolution).reduce((sum, val) => sum + val, 0);
    if (total === 0) return 0;
    return (this.storageByResolution[resolution] / total) * 100;
  }

  getResolutionColor(resolution: string): string {
    const colors: Record<string, string> = {
      '4K': 'bg-teal-500',
      '1080p': 'bg-blue-500',
      '720p': 'bg-yellow-500',
      '480p': 'bg-orange-500',
      'SD': 'bg-red-500',
      'Unknown': 'bg-gray-500'
    };
    return colors[resolution] || 'bg-gray-500';
  }
}
