import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlexService, SyncService, SyncJob } from '@core/services';
import { PlexServer } from '@core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  // Server state
  server: PlexServer | null = null;
  isLoading = true;
  
  // Connection form
  host = '';
  token = '';
  isConnecting = false;
  isTesting = false;
  connectionError = '';
  testResult: { success: boolean; name?: string; version?: string } | null = null;
  
  // Sync state
  isSyncing = false;
  syncStatus: SyncJob | null = null;
  lastSyncJobs: SyncJob[] = [];

  constructor(
    private plexService: PlexService,
    private syncService: SyncService
  ) {}

  ngOnInit(): void {
    this.loadServer();
    this.loadSyncStatus();
  }

  loadServer(): void {
    this.isLoading = true;
    this.plexService.getServer().subscribe({
      next: (response) => {
        this.server = response.server;
        if (this.server) {
          this.host = this.server.host;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadSyncStatus(): void {
    this.syncService.getStatus().subscribe({
      next: (response) => {
        this.isSyncing = response.isRunning;
        this.syncStatus = response.currentJob;
        
        if (this.isSyncing) {
          // Poll for status updates
          setTimeout(() => this.loadSyncStatus(), 2000);
        }
      }
    });

    this.syncService.getHistory(5).subscribe({
      next: (response) => {
        this.lastSyncJobs = response.jobs;
      }
    });
  }

  testConnection(): void {
    if (!this.host || !this.token) {
      this.connectionError = 'Please enter both host URL and token';
      return;
    }

    this.isTesting = true;
    this.connectionError = '';
    this.testResult = null;

    this.plexService.testConnection(this.host, this.token).subscribe({
      next: (result) => {
        this.testResult = result;
        this.isTesting = false;
      },
      error: (error) => {
        this.connectionError = error.error?.message || 'Failed to connect to Plex server';
        this.isTesting = false;
      }
    });
  }

  connectServer(): void {
    if (!this.host || !this.token) {
      this.connectionError = 'Please enter both host URL and token';
      return;
    }

    this.isConnecting = true;
    this.connectionError = '';

    this.plexService.connectServer({ host: this.host, token: this.token }).subscribe({
      next: (response) => {
        this.server = response.server;
        this.isConnecting = false;
        this.token = ''; // Clear token from form
        this.testResult = null;
      },
      error: (error) => {
        this.connectionError = error.error?.message || 'Failed to connect to Plex server';
        this.isConnecting = false;
      }
    });
  }

  disconnectServer(): void {
    if (!this.server) return;
    
    if (!confirm('Are you sure you want to disconnect this Plex server? All synced data will be removed.')) {
      return;
    }

    this.plexService.disconnectServer(this.server.id).subscribe({
      next: () => {
        this.server = null;
        this.host = '';
        this.token = '';
      },
      error: (error) => {
        this.connectionError = error.error?.message || 'Failed to disconnect server';
      }
    });
  }

  startSync(): void {
    this.isSyncing = true;
    this.syncService.startSync('full').subscribe({
      next: () => {
        this.loadSyncStatus();
      },
      error: (error) => {
        this.isSyncing = false;
        alert(error.error?.message || 'Failed to start sync');
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  getSyncProgress(): number {
    if (!this.syncStatus || !this.syncStatus.totalItems) return 0;
    return Math.round((this.syncStatus.processedItems || 0) / this.syncStatus.totalItems * 100);
  }
}
