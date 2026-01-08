import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlexService, SyncService, MoviesService, ShowsService } from '@core/services';
import { PlexServer } from '@core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  server: PlexServer | null = null;
  isLoading = true;
  movieCount = 0;
  showCount = 0;
  isServerConnected = false;

  constructor(
    private plexService: PlexService,
    private syncService: SyncService,
    private moviesService: MoviesService,
    private showsService: ShowsService
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
          this.loadLibraryStats();
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadLibraryStats(): void {
    this.moviesService.getMovies({ limit: 1 }).subscribe({
      next: (response) => {
        this.movieCount = response.pagination.total;
      }
    });

    this.showsService.getShows({ limit: 1 }).subscribe({
      next: (response) => {
        this.showCount = response.pagination.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
