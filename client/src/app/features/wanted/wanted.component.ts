import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RadarrService, SonarrService } from '@core/services';
import {
  RadarrMissingMovie,
  RadarrUpgradeMovie,
  RadarrDowngradeMovie,
  SonarrMissingEpisode,
  SonarrUpgradeEpisode,
  SonarrDowngradeEpisode,
  RadarrConfig,
  SonarrConfig
} from '@core/models';

type TabId = 'missing-movies' | 'missing-episodes' | 'movie-upgrades' | 'episode-upgrades' | 'movie-downgrades' | 'episode-downgrades';

interface Tab {
  id: TabId;
  label: string;
  count: number;
}

@Component({
  selector: 'app-wanted',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './wanted.component.html'
})
export class WantedComponent implements OnInit {
  activeTab: TabId = 'missing-movies';
  isLoading = true;
  
  // Radarr data
  radarrConfigured = false;
  missingMovies: RadarrMissingMovie[] = [];
  movieUpgrades: RadarrUpgradeMovie[] = [];
  movieDowngrades: RadarrDowngradeMovie[] = [];
  
  // Sonarr data
  sonarrConfigured = false;
  missingEpisodes: SonarrMissingEpisode[] = [];
  episodeUpgrades: SonarrUpgradeEpisode[] = [];
  episodeDowngrades: SonarrDowngradeEpisode[] = [];
  
  // Pagination
  missingMoviesTotal = 0;
  missingEpisodesTotal = 0;
  movieUpgradesTotal = 0;
  episodeUpgradesTotal = 0;
  
  // Totals for downgrades savings
  movieDowngradesSavings = 0;
  episodeDowngradesSavings = 0;

  // Search status
  searchingId: number | null = null;

  tabs: Tab[] = [
    { id: 'missing-movies', label: 'Missing Movies', count: 0 },
    { id: 'missing-episodes', label: 'Missing Episodes', count: 0 },
    { id: 'movie-upgrades', label: 'Movie Upgrades', count: 0 },
    { id: 'episode-upgrades', label: 'Episode Upgrades', count: 0 },
    { id: 'movie-downgrades', label: 'Movie Downgrades', count: 0 },
    { id: 'episode-downgrades', label: 'Episode Downgrades', count: 0 }
  ];

  constructor(
    private radarrService: RadarrService,
    private sonarrService: SonarrService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    // Load Radarr data
    this.radarrService.getConfig().subscribe({
      next: (response: { config: RadarrConfig | null }) => {
        this.radarrConfigured = !!response.config?.isConnected;
        if (this.radarrConfigured) {
          this.loadRadarrData();
        }
      },
      error: () => {
        this.radarrConfigured = false;
      }
    });

    // Load Sonarr data
    this.sonarrService.getConfig().subscribe({
      next: (response: { config: SonarrConfig | null }) => {
        this.sonarrConfigured = !!response.config?.isConnected;
        if (this.sonarrConfigured) {
          this.loadSonarrData();
        }
        this.isLoading = false;
      },
      error: () => {
        this.sonarrConfigured = false;
        this.isLoading = false;
      }
    });
  }

  loadRadarrData(): void {
    // Missing movies
    this.radarrService.getMissing(1, 100).subscribe({
      next: (response) => {
        this.missingMovies = response.movies;
        this.missingMoviesTotal = response.total;
        this.updateTabCount('missing-movies', response.total);
      }
    });

    // Movie upgrades
    this.radarrService.getUpgrades(1, 100).subscribe({
      next: (response) => {
        this.movieUpgrades = response.movies;
        this.movieUpgradesTotal = response.total;
        this.updateTabCount('movie-upgrades', response.total);
      }
    });

    // Movie downgrades
    this.radarrService.getDowngrades().subscribe({
      next: (response) => {
        this.movieDowngrades = response.movies;
        this.movieDowngradesSavings = response.movies.reduce((sum, m) => sum + m.estimatedSavings, 0);
        this.updateTabCount('movie-downgrades', response.total);
      }
    });
  }

  loadSonarrData(): void {
    // Missing episodes
    this.sonarrService.getMissing(1, 100).subscribe({
      next: (response) => {
        this.missingEpisodes = response.episodes;
        this.missingEpisodesTotal = response.total;
        this.updateTabCount('missing-episodes', response.total);
      }
    });

    // Episode upgrades
    this.sonarrService.getUpgrades(1, 100).subscribe({
      next: (response) => {
        this.episodeUpgrades = response.episodes;
        this.episodeUpgradesTotal = response.total;
        this.updateTabCount('episode-upgrades', response.total);
      }
    });

    // Episode downgrades
    this.sonarrService.getDowngrades().subscribe({
      next: (response) => {
        this.episodeDowngrades = response.episodes;
        this.episodeDowngradesSavings = response.totalEstimatedSavings;
        this.updateTabCount('episode-downgrades', response.total);
      }
    });
  }

  updateTabCount(tabId: TabId, count: number): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.count = count;
    }
  }

  setActiveTab(tabId: TabId): void {
    this.activeTab = tabId;
  }

  triggerMovieSearch(movie: RadarrMissingMovie | RadarrUpgradeMovie): void {
    this.searchingId = movie.id;
    this.radarrService.triggerSearch(movie.id).subscribe({
      next: () => {
        this.searchingId = null;
        // Could show a toast notification here
      },
      error: () => {
        this.searchingId = null;
      }
    });
  }

  triggerEpisodeSearch(episode: SonarrMissingEpisode | SonarrUpgradeEpisode): void {
    this.searchingId = episode.id;
    this.sonarrService.triggerSearch(episode.id).subscribe({
      next: () => {
        this.searchingId = null;
      },
      error: () => {
        this.searchingId = null;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatEpisodeNumber(season: number, episode: number): string {
    return `S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
  }
}
