import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RangeSliderComponent } from '../range-slider/range-slider.component';
import { FilterState, FilterOption } from '@core/models';

export interface FilterConfig {
  showResolution?: boolean;
  showVideoCodec?: boolean;
  showAudioCodec?: boolean;
  showContainer?: boolean;
  showFileSize?: boolean;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RangeSliderComponent],
  templateUrl: './filter-panel.component.html'
})
export class FilterPanelComponent implements OnInit {
  @Input() filters: FilterState = {};
  @Input() config: FilterConfig = {
    showResolution: true,
    showVideoCodec: true,
    showAudioCodec: true,
    showContainer: true,
    showFileSize: true
  };
  @Input() maxFileSizeGB = 100;
  
  @Output() filtersChange = new EventEmitter<FilterState>();
  @Output() clearFilters = new EventEmitter<void>();

  isCollapsed = false;
  isMobileOpen = false;

  // Default filter options
  resolutionOptions: FilterOption[] = [
    { value: '4K', label: '4K' },
    { value: '1080p', label: '1080p' },
    { value: '720p', label: '720p' },
    { value: '480p', label: '480p' },
    { value: 'SD', label: 'SD' }
  ];

  videoCodecOptions: FilterOption[] = [
    { value: 'HEVC', label: 'HEVC/H.265' },
    { value: 'H.264', label: 'H.264' },
    { value: 'AV1', label: 'AV1' },
    { value: 'MPEG-4', label: 'MPEG-4' },
    { value: 'VC-1', label: 'VC-1' }
  ];

  audioCodecOptions: FilterOption[] = [
    { value: 'TrueHD', label: 'TrueHD/Atmos' },
    { value: 'DTS-HD MA', label: 'DTS-HD MA' },
    { value: 'DTS', label: 'DTS' },
    { value: 'AC3', label: 'AC3/Dolby' },
    { value: 'AAC', label: 'AAC' },
    { value: 'FLAC', label: 'FLAC' }
  ];

  containerOptions: FilterOption[] = [
    { value: 'mkv', label: 'MKV' },
    { value: 'mp4', label: 'MP4' },
    { value: 'avi', label: 'AVI' },
    { value: 'm4v', label: 'M4V' }
  ];

  // Local state for file size slider
  minSizeGB = 0;
  maxSizeGB = 100;

  ngOnInit(): void {
    // Initialize file size from filters (convert bytes to GB)
    if (this.filters.minSize) {
      this.minSizeGB = Math.round(this.filters.minSize / (1024 * 1024 * 1024));
    }
    if (this.filters.maxSize) {
      this.maxSizeGB = Math.round(this.filters.maxSize / (1024 * 1024 * 1024));
    } else {
      this.maxSizeGB = this.maxFileSizeGB;
    }
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleMobile(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobile(): void {
    this.isMobileOpen = false;
  }

  onFilterChange(key: keyof FilterState, value: string | undefined): void {
    const newFilters = { ...this.filters };
    if (value) {
      (newFilters as any)[key] = value;
    } else {
      delete (newFilters as any)[key];
    }
    this.filtersChange.emit(newFilters);
  }

  onFileSizeChange(range: { min: number; max: number }): void {
    this.minSizeGB = range.min;
    this.maxSizeGB = range.max;
    
    const newFilters = { ...this.filters };
    
    // Convert GB to bytes
    if (range.min > 0) {
      newFilters.minSize = range.min * 1024 * 1024 * 1024;
    } else {
      delete newFilters.minSize;
    }
    
    if (range.max < this.maxFileSizeGB) {
      newFilters.maxSize = range.max * 1024 * 1024 * 1024;
    } else {
      delete newFilters.maxSize;
    }
    
    this.filtersChange.emit(newFilters);
  }

  onClearFilters(): void {
    this.minSizeGB = 0;
    this.maxSizeGB = this.maxFileSizeGB;
    this.clearFilters.emit();
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filters.resolution) count++;
    if (this.filters.videoCodec) count++;
    if (this.filters.audioCodec) count++;
    if (this.filters.container) count++;
    if (this.filters.minSize || (this.filters.maxSize && this.filters.maxSize < this.maxFileSizeGB * 1024 * 1024 * 1024)) count++;
    return count;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilterCount > 0;
  }
}
