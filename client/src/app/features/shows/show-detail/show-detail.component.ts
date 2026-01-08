import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShowsService, PlexService } from '@core/services';
import { TVShow, SeasonListItem, SeasonWithEpisodes, EpisodeListItem } from '@core/models';

@Component({
  selector: 'app-show-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './show-detail.component.html'
})
export class ShowDetailComponent implements OnInit {
  show: (TVShow & { seasons: SeasonListItem[] }) | null = null;
  expandedSeason: number | null = null;
  seasonEpisodes: Map<number, EpisodeListItem[]> = new Map();
  loadingSeasons: Set<number> = new Set();
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private showsService: ShowsService,
    private plexService: PlexService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadShow(id);
    } else {
      this.error = 'Show ID not provided';
      this.isLoading = false;
    }
  }

  loadShow(id: string): void {
    this.isLoading = true;
    this.showsService.getShow(id).subscribe({
      next: (response) => {
        this.show = response.show;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading show:', err);
        this.error = 'Failed to load show details';
        this.isLoading = false;
      }
    });
  }

  toggleSeason(seasonNumber: number): void {
    if (this.expandedSeason === seasonNumber) {
      this.expandedSeason = null;
    } else {
      this.expandedSeason = seasonNumber;
      
      // Load episodes if not already loaded
      if (!this.seasonEpisodes.has(seasonNumber) && this.show) {
        this.loadSeasonEpisodes(this.show.id, seasonNumber);
      }
    }
  }

  loadSeasonEpisodes(showId: string, seasonNumber: number): void {
    this.loadingSeasons.add(seasonNumber);
    
    this.showsService.getSeason(showId, seasonNumber).subscribe({
      next: (response) => {
        this.seasonEpisodes.set(seasonNumber, response.season.episodes);
        this.loadingSeasons.delete(seasonNumber);
      },
      error: (err) => {
        console.error('Error loading season:', err);
        this.loadingSeasons.delete(seasonNumber);
      }
    });
  }

  goBack(): void {
    this.location.back();
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

  getResolutionClass(resolution: string | undefined): string {
    switch (resolution) {
      case '4K': return 'bg-purple-600/20 text-purple-400';
      case '1080p': return 'bg-blue-600/20 text-blue-400';
      case '720p': return 'bg-green-600/20 text-green-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  }

  getCodecClass(codec: string | undefined): string {
    if (!codec) return 'bg-gray-600/20 text-gray-400';
    const c = codec.toLowerCase();
    if (c.includes('hevc') || c.includes('h.265') || c.includes('h265')) {
      return 'bg-purple-600/20 text-purple-400';
    }
    if (c.includes('h.264') || c.includes('h264') || c.includes('avc')) {
      return 'bg-blue-600/20 text-blue-400';
    }
    return 'bg-gray-600/20 text-gray-400';
  }

  isSeasonLoading(seasonNumber: number): boolean {
    return this.loadingSeasons.has(seasonNumber);
  }

  getSeasonEpisodes(seasonNumber: number): EpisodeListItem[] {
    return this.seasonEpisodes.get(seasonNumber) || [];
  }
}
