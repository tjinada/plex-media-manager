import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AutoSyncSettings } from '@core/models';

export interface SyncJob {
  id: string;
  type: 'full' | 'movies' | 'shows';
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalItems?: number;
  processedItems?: number;
  moviesAdded?: number;
  moviesUpdated?: number;
  showsAdded?: number;
  showsUpdated?: number;
  episodesAdded?: number;
  episodesUpdated?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SyncStatusResponse {
  isRunning: boolean;
  currentJob: SyncJob | null;
}

export interface SyncHistoryResponse {
  jobs: SyncJob[];
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  constructor(private api: ApiService) {}

  /**
   * Trigger a library sync
   */
  startSync(type: 'full' | 'movies' | 'shows' = 'full'): Observable<{ jobId: string; status: string }> {
    return this.api.post<{ jobId: string; status: string }>('/sync', { type });
  }

  /**
   * Get current sync status
   */
  getStatus(): Observable<SyncStatusResponse> {
    return this.api.get<SyncStatusResponse>('/sync/status');
  }

  /**
   * Get sync history
   */
  getHistory(limit = 10): Observable<SyncHistoryResponse> {
    return this.api.get<SyncHistoryResponse>('/sync/history', { limit });
  }

  /**
   * Get auto-sync settings
   */
  getAutoSyncSettings(): Observable<AutoSyncSettings> {
    return this.api.get<AutoSyncSettings>('/sync/auto-sync');
  }

  /**
   * Update auto-sync settings
   */
  updateAutoSyncSettings(enabled: boolean, intervalMinutes: number): Observable<AutoSyncSettings> {
    return this.api.put<AutoSyncSettings>('/sync/auto-sync', { enabled, intervalMinutes });
  }
}
