import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlexService, SyncService, RadarrService, SonarrService, TautulliService, NzbgetService, QbittorrentService, OverseerrService } from '@core/services';
import { OverseerrConfig } from '@core/services/overseerr.service';
import { TautulliConfig, TautulliConnectionInfo, TautulliImportStatus } from '@core/services/tautulli.service';
import { NzbgetConfig } from '@core/services/nzbget.service';
import { QbittorrentConfig } from '@core/services/qbittorrent.service';
import { PlexServer, RadarrConfig, SonarrConfig, AutoSyncSettings } from '@core/models';

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
export class SettingsComponent implements OnInit, OnDestroy {
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

  // Auto-sync state
  autoSyncSettings: AutoSyncSettings | null = null;
  autoSyncEnabled = false;
  autoSyncInterval = 15;
  savingAutoSync = false;
  autoSyncError = '';

  // Interval options for dropdown
  intervalOptions = [
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 360, label: '6 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '24 hours' }
  ];

  // Radarr state
  radarrConfig: RadarrConfig | null = null;
  radarrHost = '';
  radarrApiKey = '';
  radarrConnecting = false;
  radarrTesting = false;
  radarrError = '';
  radarrTestResult: { success: boolean; version?: string } | null = null;
  maxMovieSizeGB = 30; // Default 30GB

  // Sonarr state
  sonarrConfig: SonarrConfig | null = null;
  sonarrHost = '';
  sonarrApiKey = '';
  sonarrConnecting = false;
  sonarrTesting = false;
  sonarrError = '';
  sonarrTestResult: { success: boolean; version?: string } | null = null;
  maxEpisodeSizeGB = 5; // Default 5GB

  // Saving size limits
  savingRadarrSize = false;
  savingSonarrSize = false;

  // Tautulli state
  tautulliConfig: TautulliConfig | null = null;
  tautulliConfigured = false;
  tautulliHost = '';
  tautulliApiKey = '';
  tautulliConnecting = false;
  tautulliTesting = false;
  tautulliError = '';
  tautulliTestResult: TautulliConnectionInfo | null = null;
  tautulliSyncEnabled = true;
  tautulliSyncInterval = 60;
  savingTautulliSync = false;

  // Tautulli import state
  tautulliImportStatus: TautulliImportStatus | null = null;
  importPollingInterval: any = null;

  // Tautulli sync interval options
  tautulliSyncOptions = [
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' }
  ];

  // NZBGet state
  nzbgetConfig: NzbgetConfig | null = null;
  nzbgetHost = '';
  nzbgetUsername = '';
  nzbgetPassword = '';
  nzbgetConnecting = false;
  nzbgetTesting = false;
  nzbgetError = '';
  nzbgetTestResult: { success: boolean; version?: string } | null = null;

  // qBittorrent state
  qbittorrentConfig: QbittorrentConfig | null = null;
  qbittorrentHost = '';
  qbittorrentUsername = '';
  qbittorrentPassword = '';
  qbittorrentConnecting = false;
  qbittorrentTesting = false;
  qbittorrentError = '';
  qbittorrentTestResult: { success: boolean; version?: string } | null = null;

  // Overseerr state
  overseerrConfig: OverseerrConfig | null = null;
  overseerrHost = '';
  overseerrApiKey = '';
  overseerrConnecting = false;
  overseerrTesting = false;
  overseerrError = '';
  overseerrTestResult: { success: boolean; version?: string } | null = null;

  constructor(
    private plexService: PlexService,
    private syncService: SyncService,
    private radarrService: RadarrService,
    private sonarrService: SonarrService,
    private tautulliService: TautulliService,
    private nzbgetService: NzbgetService,
    private qbittorrentService: QbittorrentService,
    private overseerrService: OverseerrService
  ) {}

  ngOnInit(): void {
    this.loadServer();
    this.loadSyncStatus();
    this.loadAutoSyncSettings();
    this.loadRadarrConfig();
    this.loadSonarrConfig();
    this.loadTautulliConfig();
    this.loadNzbgetConfig();
    this.loadQbittorrentConfig();
    this.loadOverseerrConfig();
  }

  ngOnDestroy(): void {
    if (this.importPollingInterval) {
      clearInterval(this.importPollingInterval);
    }
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

  // ===== Auto-Sync Methods =====
  loadAutoSyncSettings(): void {
    this.syncService.getAutoSyncSettings().subscribe({
      next: (settings: AutoSyncSettings) => {
        this.autoSyncSettings = settings;
        this.autoSyncEnabled = settings.enabled;
        this.autoSyncInterval = settings.intervalMinutes;
      }
    });
  }

  saveAutoSyncSettings(): void {
    this.savingAutoSync = true;
    this.autoSyncError = '';

    this.syncService.updateAutoSyncSettings(this.autoSyncEnabled, this.autoSyncInterval).subscribe({
      next: (settings: AutoSyncSettings) => {
        this.autoSyncSettings = settings;
        this.savingAutoSync = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.autoSyncError = error.error?.message || 'Failed to update auto-sync settings';
        this.savingAutoSync = false;
      }
    });
  }

  toggleAutoSync(): void {
    this.autoSyncEnabled = !this.autoSyncEnabled;
    this.saveAutoSyncSettings();
  }

  formatNextRunTime(dateString: string | null): string {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Running soon...';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    
    return date.toLocaleString();
  }

  // ===== Radarr Methods =====
  loadRadarrConfig(): void {
    this.radarrService.getConfig().subscribe({
      next: (response: { config: RadarrConfig | null }) => {
        this.radarrConfig = response.config;
        if (this.radarrConfig) {
          this.radarrHost = this.radarrConfig.host;
          this.maxMovieSizeGB = Math.round(this.radarrConfig.maxMovieSize / (1024 * 1024 * 1024));
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
        this.maxMovieSizeGB = Math.round(response.config.maxMovieSize / (1024 * 1024 * 1024));
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

  saveMaxMovieSize(): void {
    this.savingRadarrSize = true;
    const sizeInBytes = this.maxMovieSizeGB * 1024 * 1024 * 1024;
    
    this.radarrService.updateConfig(sizeInBytes).subscribe({
      next: (response: { success: boolean; config: RadarrConfig }) => {
        this.radarrConfig = response.config;
        this.savingRadarrSize = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.radarrError = error.error?.message || 'Failed to update size limit';
        this.savingRadarrSize = false;
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
          this.maxEpisodeSizeGB = Math.round(this.sonarrConfig.maxEpisodeSize / (1024 * 1024 * 1024));
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
        this.maxEpisodeSizeGB = Math.round(response.config.maxEpisodeSize / (1024 * 1024 * 1024));
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

  saveMaxEpisodeSize(): void {
    this.savingSonarrSize = true;
    const sizeInBytes = this.maxEpisodeSizeGB * 1024 * 1024 * 1024;
    
    this.sonarrService.updateConfig(sizeInBytes).subscribe({
      next: (response: { success: boolean; config: SonarrConfig }) => {
        this.sonarrConfig = response.config;
        this.savingSonarrSize = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.sonarrError = error.error?.message || 'Failed to update size limit';
        this.savingSonarrSize = false;
      }
    });
  }

  // ===== Tautulli Methods =====
  loadTautulliConfig(): void {
    this.tautulliService.getConfig().subscribe({
      next: (response) => {
        this.tautulliConfigured = response.configured;
        this.tautulliConfig = response.config;
        if (this.tautulliConfig) {
          this.tautulliHost = this.tautulliConfig.host;
          this.tautulliSyncEnabled = this.tautulliConfig.syncEnabled;
          this.tautulliSyncInterval = this.tautulliConfig.syncIntervalSeconds;
        }
        // Check import status if configured
        if (this.tautulliConfigured) {
          this.checkImportStatus();
        }
      }
    });
  }

  testTautulliConnection(): void {
    if (!this.tautulliHost || !this.tautulliApiKey) {
      this.tautulliError = 'Please enter both host URL and API key';
      return;
    }

    this.tautulliTesting = true;
    this.tautulliError = '';
    this.tautulliTestResult = null;

    this.tautulliService.testConnection(this.tautulliHost, this.tautulliApiKey).subscribe({
      next: (result) => {
        this.tautulliTestResult = result;
        this.tautulliTesting = false;
      },
      error: (error: { error?: { message?: string; details?: string } }) => {
        this.tautulliError = error.error?.details || error.error?.message || 'Failed to connect to Tautulli';
        this.tautulliTesting = false;
      }
    });
  }

  connectTautulli(): void {
    if (!this.tautulliHost || !this.tautulliApiKey) {
      this.tautulliError = 'Please enter both host URL and API key';
      return;
    }

    this.tautulliConnecting = true;
    this.tautulliError = '';

    this.tautulliService.saveConfig({
      host: this.tautulliHost,
      apiKey: this.tautulliApiKey,
      syncEnabled: this.tautulliSyncEnabled,
      syncIntervalSeconds: this.tautulliSyncInterval
    }).subscribe({
      next: (response) => {
        this.tautulliConfigured = true;
        this.tautulliConfig = response.config as TautulliConfig;
        this.tautulliConnecting = false;
        this.tautulliApiKey = '';
        this.tautulliTestResult = null;
        // Reload to get full config
        this.loadTautulliConfig();
      },
      error: (error: { error?: { message?: string; details?: string } }) => {
        this.tautulliError = error.error?.details || error.error?.message || 'Failed to connect to Tautulli';
        this.tautulliConnecting = false;
      }
    });
  }

  disconnectTautulli(): void {
    if (!confirm('Are you sure you want to disconnect Tautulli? Playback session data will be preserved.')) {
      return;
    }

    this.tautulliService.deleteConfig().subscribe({
      next: () => {
        this.tautulliConfigured = false;
        this.tautulliConfig = null;
        this.tautulliHost = '';
        this.tautulliApiKey = '';
        this.stopImportPolling();
      },
      error: (error: { error?: { message?: string } }) => {
        this.tautulliError = error.error?.message || 'Failed to disconnect Tautulli';
      }
    });
  }

  saveTautulliSyncSettings(): void {
    this.savingTautulliSync = true;

    this.tautulliService.updateSyncSettings({
      syncEnabled: this.tautulliSyncEnabled,
      syncIntervalSeconds: this.tautulliSyncInterval
    }).subscribe({
      next: (response) => {
        this.tautulliSyncEnabled = response.syncEnabled;
        this.tautulliSyncInterval = response.syncIntervalSeconds;
        this.savingTautulliSync = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.tautulliError = error.error?.message || 'Failed to update sync settings';
        this.savingTautulliSync = false;
      }
    });
  }

  toggleTautulliSync(): void {
    this.tautulliSyncEnabled = !this.tautulliSyncEnabled;
    this.saveTautulliSyncSettings();
  }

  formatTautulliLastSync(): string {
    if (!this.tautulliConfig?.lastSyncAt) return 'Never';
    const date = new Date(this.tautulliConfig.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleString();
  }

  // ===== Tautulli Import Methods =====
  checkImportStatus(): void {
    this.tautulliService.getImportStatus().subscribe({
      next: (status) => {
        this.tautulliImportStatus = status;
        if (status.isImporting) {
          this.startImportPolling();
        }
      }
    });
  }

  startTautulliImport(): void {
    if (!confirm('This will import ALL playback history from Tautulli. This may take a few minutes. Continue?')) {
      return;
    }

    this.tautulliService.startImport().subscribe({
      next: () => {
        this.startImportPolling();
      },
      error: (error: { error?: { message?: string } }) => {
        this.tautulliError = error.error?.message || 'Failed to start import';
      }
    });
  }

  cancelTautulliImport(): void {
    this.tautulliService.cancelImport().subscribe({
      next: () => {
        // Status will update via polling
      },
      error: (error: { error?: { message?: string } }) => {
        this.tautulliError = error.error?.message || 'Failed to cancel import';
      }
    });
  }

  startImportPolling(): void {
    if (this.importPollingInterval) return;

    this.importPollingInterval = setInterval(() => {
      this.tautulliService.getImportStatus().subscribe({
        next: (status) => {
          this.tautulliImportStatus = status;
          if (!status.isImporting) {
            this.stopImportPolling();
            // Reload config to get updated import stats
            this.loadTautulliConfig();
          }
        }
      });
    }, 1000);
  }

  stopImportPolling(): void {
    if (this.importPollingInterval) {
      clearInterval(this.importPollingInterval);
      this.importPollingInterval = null;
    }
  }

  // ===== NZBGet Methods =====
  loadNzbgetConfig(): void {
    this.nzbgetService.getConfig().subscribe({
      next: (response) => {
        if (response.config) {
          this.nzbgetConfig = response.config;
          this.nzbgetHost = response.config.host;
        }
      }
    });
  }

  testNzbgetConnection(): void {
    if (!this.nzbgetHost) {
      this.nzbgetError = 'Please enter the NZBGet URL';
      return;
    }

    this.nzbgetTesting = true;
    this.nzbgetError = '';
    this.nzbgetTestResult = null;

    this.nzbgetService.testConnection(this.nzbgetHost, this.nzbgetUsername, this.nzbgetPassword).subscribe({
      next: (result) => {
        this.nzbgetTestResult = result;
        this.nzbgetTesting = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.nzbgetError = error.error?.message || 'Failed to connect to NZBGet';
        this.nzbgetTesting = false;
      }
    });
  }

  connectNzbget(): void {
    if (!this.nzbgetHost) {
      this.nzbgetError = 'Please enter the NZBGet URL';
      return;
    }

    this.nzbgetConnecting = true;
    this.nzbgetError = '';

    this.nzbgetService.saveConfig(this.nzbgetHost, this.nzbgetUsername, this.nzbgetPassword).subscribe({
      next: (response) => {
        this.nzbgetConfig = response.config;
        this.nzbgetConnecting = false;
        this.nzbgetPassword = '';
        this.nzbgetTestResult = null;
      },
      error: (error: { error?: { message?: string } }) => {
        this.nzbgetError = error.error?.message || 'Failed to connect to NZBGet';
        this.nzbgetConnecting = false;
      }
    });
  }

  disconnectNzbget(): void {
    if (!confirm('Are you sure you want to disconnect NZBGet?')) {
      return;
    }

    this.nzbgetService.deleteConfig().subscribe({
      next: () => {
        this.nzbgetConfig = null;
        this.nzbgetHost = '';
        this.nzbgetUsername = '';
        this.nzbgetPassword = '';
      },
      error: (error: { error?: { message?: string } }) => {
        this.nzbgetError = error.error?.message || 'Failed to disconnect NZBGet';
      }
    });
  }

  // ===== qBittorrent Methods =====
  loadQbittorrentConfig(): void {
    this.qbittorrentService.getConfig().subscribe({
      next: (response) => {
        if (response.config) {
          this.qbittorrentConfig = response.config;
          this.qbittorrentHost = response.config.host;
        }
      }
    });
  }

  testQbittorrentConnection(): void {
    if (!this.qbittorrentHost) {
      this.qbittorrentError = 'Please enter the qBittorrent URL';
      return;
    }

    this.qbittorrentTesting = true;
    this.qbittorrentError = '';
    this.qbittorrentTestResult = null;

    this.qbittorrentService.testConnection(this.qbittorrentHost, this.qbittorrentUsername, this.qbittorrentPassword).subscribe({
      next: (result) => {
        this.qbittorrentTestResult = result;
        this.qbittorrentTesting = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.qbittorrentError = error.error?.message || 'Failed to connect to qBittorrent';
        this.qbittorrentTesting = false;
      }
    });
  }

  connectQbittorrent(): void {
    if (!this.qbittorrentHost) {
      this.qbittorrentError = 'Please enter the qBittorrent URL';
      return;
    }

    this.qbittorrentConnecting = true;
    this.qbittorrentError = '';

    this.qbittorrentService.saveConfig(this.qbittorrentHost, this.qbittorrentUsername, this.qbittorrentPassword).subscribe({
      next: (response) => {
        this.qbittorrentConfig = response.config;
        this.qbittorrentConnecting = false;
        this.qbittorrentPassword = '';
        this.qbittorrentTestResult = null;
      },
      error: (error: { error?: { message?: string } }) => {
        this.qbittorrentError = error.error?.message || 'Failed to connect to qBittorrent';
        this.qbittorrentConnecting = false;
      }
    });
  }

  disconnectQbittorrent(): void {
    if (!confirm('Are you sure you want to disconnect qBittorrent?')) {
      return;
    }

    this.qbittorrentService.deleteConfig().subscribe({
      next: () => {
        this.qbittorrentConfig = null;
        this.qbittorrentHost = '';
        this.qbittorrentUsername = '';
        this.qbittorrentPassword = '';
      },
      error: (error: { error?: { message?: string } }) => {
        this.qbittorrentError = error.error?.message || 'Failed to disconnect qBittorrent';
      }
    });
  }

  // ===== Overseerr Methods =====
  loadOverseerrConfig(): void {
    this.overseerrService.getConfig().subscribe({
      next: (response) => {
        if (response.config) {
          this.overseerrConfig = response.config;
          this.overseerrHost = response.config.host;
        }
      }
    });
  }

  testOverseerrConnection(): void {
    if (!this.overseerrHost || !this.overseerrApiKey) {
      this.overseerrError = 'Please enter both host URL and API key';
      return;
    }

    this.overseerrTesting = true;
    this.overseerrError = '';
    this.overseerrTestResult = null;

    this.overseerrService.testConnection(this.overseerrHost, this.overseerrApiKey).subscribe({
      next: (result) => {
        this.overseerrTestResult = result;
        this.overseerrTesting = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.overseerrError = error.error?.message || 'Failed to connect to Overseerr';
        this.overseerrTesting = false;
      }
    });
  }

  connectOverseerr(): void {
    if (!this.overseerrHost || !this.overseerrApiKey) {
      this.overseerrError = 'Please enter both host URL and API key';
      return;
    }

    this.overseerrConnecting = true;
    this.overseerrError = '';

    this.overseerrService.saveConfig(this.overseerrHost, this.overseerrApiKey).subscribe({
      next: (response) => {
        this.overseerrConfig = response.config;
        this.overseerrConnecting = false;
        this.overseerrApiKey = '';
        this.overseerrTestResult = null;
      },
      error: (error: { error?: { message?: string } }) => {
        this.overseerrError = error.error?.message || 'Failed to connect to Overseerr';
        this.overseerrConnecting = false;
      }
    });
  }

  disconnectOverseerr(): void {
    if (!confirm('Are you sure you want to disconnect Overseerr?')) {
      return;
    }

    this.overseerrService.deleteConfig().subscribe({
      next: () => {
        this.overseerrConfig = null;
        this.overseerrHost = '';
        this.overseerrApiKey = '';
      },
      error: (error: { error?: { message?: string } }) => {
        this.overseerrError = error.error?.message || 'Failed to disconnect Overseerr';
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

  formatNumber(num: number): string {
    return num.toLocaleString();
  }
}
