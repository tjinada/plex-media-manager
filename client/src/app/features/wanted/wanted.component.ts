import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RadarrService, SonarrService } from '@core/services';
import {
  RadarrMissingMovie,
  RadarrUpcomingMovie,
  RadarrUpgradeMovie,
  RadarrDowngradeMovie,
  SonarrMissingEpisode,
  SonarrUpcomingEpisode,
  SonarrUpgradeEpisode,
  SonarrDowngradeEpisode,
  RadarrConfig,
  SonarrConfig,
  RadarrRelease,
  SonarrRelease
} from '@core/models';

type TabId = 'missing-movies' | 'missing-episodes' | 'upcoming-movies' | 'upcoming-episodes' | 'movie-upgrades' | 'episode-upgrades' | 'movie-downgrades' | 'episode-downgrades';

interface Tab {
  id: TabId;
  label: string;
  icon: 'warning' | 'clock' | 'arrow-up' | 'arrow-down';
  count: number;
}

type Release = RadarrRelease | SonarrRelease;

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
  upcomingMovies: RadarrUpcomingMovie[] = [];
  movieUpgrades: RadarrUpgradeMovie[] = [];
  movieDowngrades: RadarrDowngradeMovie[] = [];
  
  // Sonarr data
  sonarrConfigured = false;
  missingEpisodes: SonarrMissingEpisode[] = [];
  upcomingEpisodes: SonarrUpcomingEpisode[] = [];
  episodeUpgrades: SonarrUpgradeEpisode[] = [];
  episodeDowngrades: SonarrDowngradeEpisode[] = [];
  
  // Pagination
  missingMoviesTotal = 0;
  upcomingMoviesTotal = 0;
  missingEpisodesTotal = 0;
  upcomingEpisodesTotal = 0;
  movieUpgradesTotal = 0;
  episodeUpgradesTotal = 0;
  
  // Totals for downgrades savings
  movieDowngradesSavings = 0;
  episodeDowngradesSavings = 0;

  // Search status
  searchingId: number | null = null;

  // Interactive Search Modal
  showSearchModal = false;
  searchModalTitle = '';
  searchModalType: 'movie' | 'episode' = 'movie';
  searchModalId: number | null = null;
  searchResults: Release[] = [];
  isSearching = false;
  downloadingGuid: string | null = null;
  searchError = '';

  tabs: Tab[] = [
    { id: 'missing-movies', label: 'Missing Movies', icon: 'warning', count: 0 },
    { id: 'missing-episodes', label: 'Missing Episodes', icon: 'warning', count: 0 },
    { id: 'upcoming-movies', label: 'Upcoming Movies', icon: 'clock', count: 0 },
    { id: 'upcoming-episodes', label: 'Upcoming Episodes', icon: 'clock', count: 0 },
    { id: 'movie-upgrades', label: 'Movie Upgrades', icon: 'arrow-up', count: 0 },
    { id: 'episode-upgrades', label: 'Episode Upgrades', icon: 'arrow-up', count: 0 },
    { id: 'movie-downgrades', label: 'Movie Downgrades', icon: 'arrow-down', count: 0 },
    { id: 'episode-downgrades', label: 'Episode Downgrades', icon: 'arrow-down', count: 0 }
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
    // Missing movies (released but not downloaded)
    this.radarrService.getMissing(1, 100).subscribe({
      next: (response) => {
        this.missingMovies = response.movies;
        this.missingMoviesTotal = response.total;
        this.updateTabCount('missing-movies', response.total);
      }
    });

    // Upcoming movies (not yet released)
    this.radarrService.getUpcoming(1, 100).subscribe({
      next: (response) => {
        this.upcomingMovies = response.movies;
        this.upcomingMoviesTotal = response.total;
        this.updateTabCount('upcoming-movies', response.total);
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
    // Missing episodes (aired but not downloaded)
    this.sonarrService.getMissing(1, 100).subscribe({
      next: (response) => {
        this.missingEpisodes = response.episodes;
        this.missingEpisodesTotal = response.total;
        this.updateTabCount('missing-episodes', response.total);
      }
    });

    // Upcoming episodes (not yet aired)
    this.sonarrService.getUpcoming(1, 100).subscribe({
      next: (response) => {
        this.upcomingEpisodes = response.episodes;
        this.upcomingEpisodesTotal = response.total;
        this.updateTabCount('upcoming-episodes', response.total);
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

  // ===== Interactive Search Modal Methods =====

  openMovieSearch(movie: RadarrMissingMovie | RadarrUpgradeMovie): void {
    this.searchModalTitle = `${movie.title} (${movie.year})`;
    this.searchModalType = 'movie';
    this.searchModalId = movie.id;
    this.searchResults = [];
    this.searchError = '';
    this.showSearchModal = true;
    this.loadSearchResults();
  }

  openEpisodeSearch(episode: SonarrMissingEpisode | SonarrUpgradeEpisode): void {
    this.searchModalTitle = `${episode.seriesTitle} - ${this.formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}`;
    this.searchModalType = 'episode';
    this.searchModalId = episode.id;
    this.searchResults = [];
    this.searchError = '';
    this.showSearchModal = true;
    this.loadSearchResults();
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    this.searchResults = [];
    this.searchModalId = null;
    this.searchError = '';
  }

  loadSearchResults(): void {
    if (!this.searchModalId) return;

    this.isSearching = true;
    this.searchError = '';

    if (this.searchModalType === 'movie') {
      this.radarrService.getSearchResults(this.searchModalId).subscribe({
        next: (response) => {
          this.searchResults = response.releases;
          this.isSearching = false;
        },
        error: (error: { error?: { message?: string } }) => {
          this.searchError = error.error?.message || 'Failed to fetch search results';
          this.isSearching = false;
        }
      });
    } else {
      this.sonarrService.getSearchResults(this.searchModalId).subscribe({
        next: (response) => {
          this.searchResults = response.releases;
          this.isSearching = false;
        },
        error: (error: { error?: { message?: string } }) => {
          this.searchError = error.error?.message || 'Failed to fetch search results';
          this.isSearching = false;
        }
      });
    }
  }

  downloadRelease(release: Release): void {
    this.downloadingGuid = release.guid;

    if (this.searchModalType === 'movie') {
      this.radarrService.downloadRelease(release.guid, release.indexerId).subscribe({
        next: () => {
          this.downloadingGuid = null;
          this.closeSearchModal();
        },
        error: (error: { error?: { message?: string } }) => {
          this.searchError = error.error?.message || 'Failed to download release';
          this.downloadingGuid = null;
        }
      });
    } else {
      this.sonarrService.downloadRelease(release.guid, release.indexerId).subscribe({
        next: () => {
          this.downloadingGuid = null;
          this.closeSearchModal();
        },
        error: (error: { error?: { message?: string } }) => {
          this.searchError = error.error?.message || 'Failed to download release';
          this.downloadingGuid = null;
        }
      });
    }
  }

  // Legacy trigger search (for backwards compatibility)
  triggerMovieSearch(movie: RadarrMissingMovie | RadarrUpgradeMovie): void {
    this.openMovieSearch(movie);
  }

  triggerEpisodeSearch(episode: SonarrMissingEpisode | SonarrUpgradeEpisode): void {
    this.openEpisodeSearch(episode);
  }

  // ===== Formatting Methods =====

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString();
  }

  formatEpisodeNumber(season: number, episode: number): string {
    return `S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
  }

  formatAge(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  }

  getRelativeDate(dateString: string | null | undefined): string {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return this.formatDate(dateString);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
    return this.formatDate(dateString);
  }

  getProtocolBadgeClass(protocol: string): string {
    return protocol === 'torrent' ? 'bg-green-600' : 'bg-blue-600';
  }

  getProtocolLabel(protocol: string): string {
    return protocol === 'torrent' ? 'torrent' : 'nzb';
  }
}
