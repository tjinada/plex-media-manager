import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QbittorrentConfig {
  host: string;
  username?: string;
  externalUrl?: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: string;
}

export interface QbittorrentConfigResponse {
  configured: boolean;
  config: QbittorrentConfig | null;
}

export interface QbittorrentTestResult {
  success: boolean;
  version?: string;
}

export interface QbittorrentTorrent {
  id: string;
  hash: string;
  name: string;
  status: string;
  progress: number;
  size: number;
  sizeRemaining: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta?: string;
  etaSeconds?: number;
  seeds: number;
  peers: number;
  ratio: number;
  category: string;
  added?: Date;
}

export interface QbittorrentQueue {
  torrents: QbittorrentTorrent[];
  downloadSpeed: number;
  uploadSpeed: number;
}

@Injectable({
  providedIn: 'root'
})
export class QbittorrentService {
  private apiUrl = '/api/qbittorrent';

  constructor(private http: HttpClient) {}

  getConfig(): Observable<QbittorrentConfigResponse> {
    return this.http.get<QbittorrentConfigResponse>(`${this.apiUrl}/config`);
  }

  testConnection(host: string, username?: string, password?: string): Observable<QbittorrentTestResult> {
    return this.http.post<QbittorrentTestResult>(`${this.apiUrl}/test`, {
      host,
      username,
      password
    });
  }

  saveConfig(host: string, username?: string, password?: string, externalUrl?: string): Observable<{ success: boolean; config: QbittorrentConfig }> {
    return this.http.post<{ success: boolean; config: QbittorrentConfig }>(`${this.apiUrl}/config`, {
      host,
      username,
      password,
      externalUrl
    });
  }

  updateConfig(externalUrl?: string): Observable<{ success: boolean; config: QbittorrentConfig }> {
    return this.http.patch<{ success: boolean; config: QbittorrentConfig }>(`${this.apiUrl}/config`, {
      externalUrl
    });
  }

  deleteConfig(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/config`);
  }

  getQueue(): Observable<QbittorrentQueue> {
    return this.http.get<QbittorrentQueue>(`${this.apiUrl}/queue`);
  }
}
