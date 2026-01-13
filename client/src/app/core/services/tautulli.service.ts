import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TautulliConfig {
  host: string;
  enabled: boolean;
  isConnected: boolean;
  serverName: string | null;
  version: string | null;
  syncEnabled: boolean;
  syncIntervalSeconds: number;
  lastSyncAt: string | null;
  lastSyncSessionCount: number;
  historyImported: boolean;
  historyImportedAt: string | null;
  totalSessionsImported: number;
  createdAt: string;
  updatedAt: string;
}

export interface TautulliConfigResponse {
  configured: boolean;
  config: TautulliConfig | null;
}

export interface TautulliConnectionInfo {
  success: boolean;
  serverName: string;
  version: string;
  pythonVersion: string;
  platform: string;
  plexName: string;
  plexVersion: string;
  historyCount?: number;
  estimatedImportTime?: string;
}

export interface TautulliSaveResponse {
  success: boolean;
  message: string;
  config: Partial<TautulliConfig>;
  connectionInfo: TautulliConnectionInfo;
}

export interface TautulliActivity {
  streamCount: number;
  sessions: any[];
  lanBandwidth: number;
  wanBandwidth: number;
}

export interface TautulliImportStatus {
  isImporting: boolean;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  status: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TautulliService {
  private apiUrl = '/api/tautulli';

  constructor(private http: HttpClient) {}

  /**
   * Get current Tautulli configuration
   */
  getConfig(): Observable<TautulliConfigResponse> {
    return this.http.get<TautulliConfigResponse>(`${this.apiUrl}/config`);
  }

  /**
   * Save Tautulli configuration
   */
  saveConfig(config: {
    host: string;
    apiKey: string;
    enabled?: boolean;
    syncEnabled?: boolean;
    syncIntervalSeconds?: number;
  }): Observable<TautulliSaveResponse> {
    return this.http.post<TautulliSaveResponse>(`${this.apiUrl}/config`, config);
  }

  /**
   * Delete Tautulli configuration
   */
  deleteConfig(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/config`);
  }

  /**
   * Test Tautulli connection
   */
  testConnection(host: string, apiKey: string): Observable<TautulliConnectionInfo> {
    return this.http.post<TautulliConnectionInfo>(`${this.apiUrl}/test`, { host, apiKey });
  }

  /**
   * Update sync settings
   */
  updateSyncSettings(settings: {
    syncEnabled?: boolean;
    syncIntervalSeconds?: number;
  }): Observable<{ success: boolean; syncEnabled: boolean; syncIntervalSeconds: number }> {
    return this.http.patch<any>(`${this.apiUrl}/sync-settings`, settings);
  }

  /**
   * Get Tautulli stats
   */
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  /**
   * Get current activity
   */
  getActivity(): Observable<TautulliActivity> {
    return this.http.get<TautulliActivity>(`${this.apiUrl}/activity`);
  }

  /**
   * Start historical import (Phase 2)
   */
  startImport(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/import`, {});
  }

  /**
   * Get import status (Phase 2)
   */
  getImportStatus(): Observable<TautulliImportStatus> {
    return this.http.get<TautulliImportStatus>(`${this.apiUrl}/import/status`);
  }

  /**
   * Cancel import (Phase 2)
   */
  cancelImport(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/import/cancel`, {});
  }
}
