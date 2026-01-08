import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlexService, SyncService, RadarrService, SonarrService } from '@core/services';
import { PlexServer, RadarrConfig, SonarrConfig } from '@core/models';

export interface SyncJob {
  id: string;
  type: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalItems?: number;
  processedItems?: number;
  moviesAdded?: number;
  episodesAdded?: number;
  error?: string;
}

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
  
  // Plex Connection form
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

  // Radarr state
  radarrConfig: RadarrConfig | null = null;
  radarrHost = '';
  radarrApiKey = '';
  radarrConnecting = false;
  radarrTesting = false;
  radarrError = '';
  radarrTestResult: { success: boolean; version?: string } | null = null;

  // Sonarr state
  sonarrConfig: SonarrConfig | null = null;
  sonarrHost = '';
  sonarrApiKey = '';
  sonarrConnecting = false;
  sonarrTesting = false;
  sonarrError = '';
  sonarrTestResult: { success: boolean; version?: string } | null = null;

  constructor(
    private plexService: PlexService,
    private syncService: SyncService,
    private radarrService: RadarrService,
    private sonarrService: SonarrService
  ) {}

  ngOnInit(): void {
    this.loadServer();
    this.loadSyncStatus();
    this.loadRadarrConfig();
    this.loadSonarrConfig();
  }

  // ===== Plex Methods =====
  loadServer(): void {
    this.isLoading = true;
    this.plexService.getServer().subscribe({
      next: (response: { server: PlexServer | null }) => {
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
      next: (response: { isRunning: boolean; currentJob: SyncJob | null }) => {
        this.isSyncing = response.isRunning;
        this.syncStatus = response.currentJob;
        
        if (this.isSyncing) {
          setTimeout(() => this.loadSyncStatus(), 2000);
        }
      }
    });

    this.syncService.getHistory(5).subscribe({
      next: (response: { jobs: SyncJob[] }) => {
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
      next: (result: { success: boolean; name?: string; version?: string }) => {
        this.testResult = result;
        this.isTesting = false;
      },
      error: (error: { error?: { message?: string } }) => {
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
      next: (response: { server: PlexServer }) => {
        this.server = response.server;
        this.isConnecting = false;
        this.token = '';
        this.testResult = null;
      },
      error: (error: { error?: { message?: string } }) => {
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
      error: (error: { error?: { message?: string } }) => {
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
      error: (error: { error?: { message?: string } }) => {
        this.isSyncing = false;
        alert(error.error?.message || 'Failed to start sync');
      }
    });
  }

  // ===== Radarr Methods =====
  loadRadarrConfig(): void {
    this.radarrService.getConfig().subscribe({
      next: (response: { config: RadarrConfig | null }) => {
        this.radarrConfig = response.config;
        if (this.radarrConfig) {
          this.radarrHost = this.radarrConfig.host;
        }
      }
    });
  }

  testRadarrConnection(): void {
    if (!this.radarrHost || !this.radarrApiKey) {
      this.radarrError = 'Please enter both host URL and API key';
      return;
    }

    this.radarrTesting = true;
    this.radarrError = '';
    this.radarrTestResult = null;

    this.radarrService.testConnection(this.radarrHost, this.radarrApiKey).subscribe({
      next: (result: { success: boolean; version?: string }) => {
        this.radarrTestResult = result;
        this.radarrTesting = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.radarrError = error.error?.message || 'Failed to connect to Radarr';
        this.radarrTesting = false;
      }
    });
  }

  connectRadarr(): void {
    if (!this.radarrHost || !this.radarrApiKey) {
      this.radarrError = 'Please enter both host URL and API key';
      return;
    }

    this.radarrConnecting = true;
    this.radarrError = '';

    this.radarrService.saveConfig(this.radarrHost, this.radarrApiKey).subscribe({
      next: (response: { success: boolean; config: RadarrConfig }) => {
        this.radarrConfig = response.config;
        this.radarrConnecting = false;
        this.radarrApiKey = '';
        this.radarrTestResult = null;
      },
      error: (error: { error?: { message?: string } }) => {
        this.radarrError = error.error?.message || 'Failed to connect to Radarr';
        this.radarrConnecting = false;
      }
    });
  }

  disconnectRadarr(): void {
    if (!confirm('Are you sure you want to disconnect Radarr?')) {
      return;
    }

    this.radarrService.deleteConfig().subscribe({
      next: () => {
        this.radarrConfig = null;
        this.radarrHost = '';
        this.radarrApiKey = '';
      },
      error: (error: { error?: { message?: string } }) => {
        this.radarrError = error.error?.message || 'Failed to disconnect Radarr';
      }
    });
  }

  // ===== Sonarr Methods =====
  loadSonarrConfig(): void {
    this.sonarrService.getConfig().subscribe({
      next: (response: { config: SonarrConfig | null }) => {
        this.sonarrConfig = response.config;
        if (this.sonarrConfig) {
          this.sonarrHost = this.sonarrConfig.host;
        }
      }
    });
  }

  testSonarrConnection(): void {
    if (!this.sonarrHost || !this.sonarrApiKey) {
      this.sonarrError = 'Please enter both host URL and API key';
      return;
    }

    this.sonarrTesting = true;
    this.sonarrError = '';
    this.sonarrTestResult = null;

    this.sonarrService.testConnection(this.sonarrHost, this.sonarrApiKey).subscribe({
      next: (result: { success: boolean; version?: string }) => {
        this.sonarrTestResult = result;
        this.sonarrTesting = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.sonarrError = error.error?.message || 'Failed to connect to Sonarr';
        this.sonarrTesting = false;
      }
    });
  }

  connectSonarr(): void {
    if (!this.sonarrHost || !this.sonarrApiKey) {
      this.sonarrError = 'Please enter both host URL and API key';
      return;
    }

    this.sonarrConnecting = true;
    this.sonarrError = '';

    this.sonarrService.saveConfig(this.sonarrHost, this.sonarrApiKey).subscribe({
      next: (response: { success: boolean; config: SonarrConfig }) => {
        this.sonarrConfig = response.config;
        this.sonarrConnecting = false;
        this.sonarrApiKey = '';
        this.sonarrTestResult = null;
      },
      error: (error: { error?: { message?: string } }) => {
        this.sonarrError = error.error?.message || 'Failed to connect to Sonarr';
        this.sonarrConnecting = false;
      }
    });
  }

  disconnectSonarr(): void {
    if (!confirm('Are you sure you want to disconnect Sonarr?')) {
      return;
    }

    this.sonarrService.deleteConfig().subscribe({
      next: () => {
        this.sonarrConfig = null;
        this.sonarrHost = '';
        this.sonarrApiKey = '';
      },
      error: (error: { error?: { message?: string } }) => {
        this.sonarrError = error.error?.message || 'Failed to disconnect Sonarr';
      }
    });
  }

  // ===== Utility Methods =====
  formatDate(dateString: string | undefined | null): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  getSyncProgress(): number {
    if (!this.syncStatus || !this.syncStatus.totalItems) return 0;
    return Math.round((this.syncStatus.processedItems || 0) / this.syncStatus.totalItems * 100);
  }
}
