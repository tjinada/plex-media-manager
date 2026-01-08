import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, Chart } from 'chart.js';
import { PlexService, StatsService } from '@core/services';
import { PlexServer, StatsOverview, TopMovie, TopEpisode } from '@core/models';
import { ChartCardComponent } from '@shared/components/chart-card/chart-card.component';
import { forkJoin } from 'rxjs';

// Set Chart.js defaults for dark theme
Chart.defaults.color = '#f3f4f6';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgChartsModule, ChartCardComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  server: PlexServer | null = null;
  isLoading = true;
  isServerConnected = false;
  
  overview: StatsOverview = {
    totalMovies: 0,
    totalShows: 0,
    totalEpisodes: 0,
    totalStorage: 0
  };

  topMovies: TopMovie[] = [];
  topEpisodes: TopEpisode[] = [];

  // Chart configurations
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#f3f4f6',
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 14,
            weight: 'bold'
          },
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 14
        },
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${percentage}%`;
          }
        }
      }
    }
  };

  resolutionData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  videoCodecData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  audioCodecData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  containerData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  // Separate data for movies and episodes
  resolutionMovies: ChartData<'doughnut'> = { labels: [], datasets: [] };
  resolutionEpisodes: ChartData<'doughnut'> = { labels: [], datasets: [] };
  videoCodecMovies: ChartData<'doughnut'> = { labels: [], datasets: [] };
  videoCodecEpisodes: ChartData<'doughnut'> = { labels: [], datasets: [] };
  audioCodecMovies: ChartData<'doughnut'> = { labels: [], datasets: [] };
  audioCodecEpisodes: ChartData<'doughnut'> = { labels: [], datasets: [] };
  containerMovies: ChartData<'doughnut'> = { labels: [], datasets: [] };
  containerEpisodes: ChartData<'doughnut'> = { labels: [], datasets: [] };

  // Tab states
  resolutionTab: 'all' | 'movies' | 'episodes' = 'all';
  videoCodecTab: 'all' | 'movies' | 'episodes' = 'all';
  audioCodecTab: 'all' | 'movies' | 'episodes' = 'all';
  containerTab: 'all' | 'movies' | 'episodes' = 'all';

  private chartColors = [
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#22c55e', // green
    '#ec4899', // pink
    '#6366f1'  // indigo
  ];

  constructor(
    private plexService: PlexService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    this.plexService.getServer().subscribe({
      next: (response) => {
        this.server = response.server;
        this.isServerConnected = !!response.server?.isConnected;
        
        if (this.isServerConnected) {
          this.loadStats();
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    forkJoin({
      overview: this.statsService.getOverview(),
      resolution: this.statsService.getResolutionDistribution(),
      codecs: this.statsService.getCodecDistribution(),
      containers: this.statsService.getContainerDistribution(),
      storage: this.statsService.getStorageStats()
    }).subscribe({
      next: ({ overview, resolution, codecs, containers, storage }) => {
        this.overview = overview;
        this.topMovies = storage.topMovies.slice(0, 5);
        this.topEpisodes = storage.topEpisodes.slice(0, 5);
        
        // Combined data (All)
        this.resolutionData = this.createChartData(
          this.mergeDistributions(resolution.movies, resolution.episodes)
        );
        this.videoCodecData = this.createChartData(
          this.mergeDistributions(codecs.video.movies, codecs.video.episodes)
        );
        this.audioCodecData = this.createChartData(
          this.mergeDistributions(codecs.audio.movies, codecs.audio.episodes)
        );
        this.containerData = this.createChartData(
          this.mergeDistributions(containers.movies, containers.episodes)
        );

        // Movies only
        this.resolutionMovies = this.createChartData(resolution.movies);
        this.videoCodecMovies = this.createChartData(codecs.video.movies);
        this.audioCodecMovies = this.createChartData(codecs.audio.movies);
        this.containerMovies = this.createChartData(containers.movies);

        // Episodes only
        this.resolutionEpisodes = this.createChartData(resolution.episodes);
        this.videoCodecEpisodes = this.createChartData(codecs.video.episodes);
        this.audioCodecEpisodes = this.createChartData(codecs.audio.episodes);
        this.containerEpisodes = this.createChartData(containers.episodes);
        
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private mergeDistributions(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
    const merged: Record<string, number> = { ...a };
    for (const [key, value] of Object.entries(b)) {
      merged[key] = (merged[key] || 0) + value;
    }
    return merged;
  }

  private createChartData(data: Record<string, number>): ChartData<'doughnut'> {
    const sorted = Object.entries(data)
      .filter(([key]) => key && key !== 'Unknown')
      .sort((a, b) => b[1] - a[1]);
    
    return {
      labels: sorted.map(([key, value]) => `${key}: ${value.toLocaleString()}`),
      datasets: [{
        data: sorted.map(([, value]) => value),
        backgroundColor: this.chartColors.slice(0, sorted.length),
        borderWidth: 0
      }]
    };
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

  // Get chart data based on selected tab
  getResolutionData(): ChartData<'doughnut'> {
    switch (this.resolutionTab) {
      case 'movies': return this.resolutionMovies;
      case 'episodes': return this.resolutionEpisodes;
      default: return this.resolutionData;
    }
  }

  getVideoCodecData(): ChartData<'doughnut'> {
    switch (this.videoCodecTab) {
      case 'movies': return this.videoCodecMovies;
      case 'episodes': return this.videoCodecEpisodes;
      default: return this.videoCodecData;
    }
  }

  getAudioCodecData(): ChartData<'doughnut'> {
    switch (this.audioCodecTab) {
      case 'movies': return this.audioCodecMovies;
      case 'episodes': return this.audioCodecEpisodes;
      default: return this.audioCodecData;
    }
  }

  getContainerData(): ChartData<'doughnut'> {
    switch (this.containerTab) {
      case 'movies': return this.containerMovies;
      case 'episodes': return this.containerEpisodes;
      default: return this.containerData;
    }
  }
}
