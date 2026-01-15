import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NzbgetConfig {
  host: string;
  username?: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: string;
}

export interface NzbgetConfigResponse {
  configured: boolean;
  config: NzbgetConfig | null;
}

export interface NzbgetTestResult {
  success: boolean;
  version?: string;
}

export interface NzbgetDownload {
  id: string;
  nzbId: number;
  name: string;
  status: string;
  progress: number;
  size: number;
  sizeRemaining: number;
  speed: number;
  category: string;
  eta?: string;
}

export interface NzbgetQueue {
  downloads: NzbgetDownload[];
  speed: number;
  sizeRemaining: number;
  downloadPaused: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NzbgetService {
  private apiUrl = '/api/nzbget';

  constructor(private http: HttpClient) {}

  getConfig(): Observable<NzbgetConfigResponse> {
    return this.http.get<NzbgetConfigResponse>(`${this.apiUrl}/config`);
  }

  testConnection(host: string, username?: string, password?: string): Observable<NzbgetTestResult> {
    return this.http.post<NzbgetTestResult>(`${this.apiUrl}/test`, {
      host,
      username,
      password
    });
  }

  saveConfig(host: string, username?: string, password?: string): Observable<{ success: boolean; config: NzbgetConfig }> {
    return this.http.post<{ success: boolean; config: NzbgetConfig }>(`${this.apiUrl}/config`, {
      host,
      username,
      password
    });
  }

  deleteConfig(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/config`);
  }

  getQueue(): Observable<NzbgetQueue> {
    return this.http.get<NzbgetQueue>(`${this.apiUrl}/queue`);
  }
}
