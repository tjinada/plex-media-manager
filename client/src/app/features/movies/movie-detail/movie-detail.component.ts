import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MoviesService, PlexService } from '@core/services';
import { Movie } from '@core/models';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './movie-detail.component.html'
})
export class MovieDetailComponent implements OnInit {
  movie: Movie | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private moviesService: MoviesService,
    private plexService: PlexService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMovie(id);
    } else {
      this.error = 'Movie ID not provided';
      this.isLoading = false;
    }
  }

  loadMovie(id: string): void {
    this.isLoading = true;
    this.moviesService.getMovie(id).subscribe({
      next: (response) => {
        this.movie = response.movie;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading movie:', err);
        this.error = 'Failed to load movie details';
        this.isLoading = false;
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
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  formatDuration(ms: number | undefined): string {
    if (!ms) return '-';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  formatBitrate(kbps: number | undefined): string {
    if (!kbps) return '-';
    return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} Kbps`;
  }

  formatChannels(channels: number | undefined): string {
    if (!channels) return '-';
    switch (channels) {
      case 2: return '2.0 Stereo';
      case 6: return '5.1';
      case 8: return '7.1';
      default: return `${channels} channels`;
    }
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
    if (c.includes('av1')) {
      return 'bg-teal-600/20 text-teal-400';
    }
    return 'bg-gray-600/20 text-gray-400';
  }

  getAdditionalAudioTracks(): { codec: string; channels: number; language?: string; title?: string }[] {
    return this.movie?.media?.audioTracks?.slice(1) || [];
  }

  getSubtitles(): { language?: string; codec: string; forced: boolean; title?: string }[] {
    return this.movie?.media?.subtitles || [];
  }

  hasAdditionalAudioTracks(): boolean {
    return (this.movie?.media?.audioTracks?.length ?? 0) > 1;
  }

  hasSubtitles(): boolean {
    return (this.movie?.media?.subtitles?.length ?? 0) > 0;
  }
}
