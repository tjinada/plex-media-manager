import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OverseerrConfig {
  host: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: string;
}

export interface OverseerrRequest {
  id: number;
  type: 'movie' | 'tv';
  status: 'pending' | 'approved' | 'declined' | 'available' | 'unknown';
  mediaStatus: string;
  createdAt: string;
  updatedAt: string;
  media: {
    id: number;
    tmdbId: number;
    tvdbId?: number;
    title: string;
    posterPath?: string;
    backdropPath?: string;
    releaseDate?: string;
    status: string;
  };
  requestedBy: {
    id: number;
    displayName: string;
    avatar?: string;
  };
  seasons?: {
    seasonNumber: number;
    status: number;
  }[];
}

export interface OverseerrStats {
  pending: number;
  approved: number;
  processing: number;
  available: number;
  configured: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OverseerrService {
  constructor(
    private http: HttpClient,
    private api: ApiService
  ) {}

  getConfig(): Observable<{ config: OverseerrConfig | null }> {
    return this.http.get<{ config: OverseerrConfig | null }>(`${this.api.baseUrl}/overseerr/config`);
  }

  testConnection(host: string, apiKey: string): Observable<{ success: boolean; version?: string }> {
    return this.http.post<{ success: boolean; version?: string }>(`${this.api.baseUrl}/overseerr/test`, { host, apiKey });
  }

  saveConfig(host: string, apiKey: string): Observable<{ success: boolean; config: OverseerrConfig }> {
    return this.http.post<{ success: boolean; config: OverseerrConfig }>(`${this.api.baseUrl}/overseerr/config`, { host, apiKey });
  }

  deleteConfig(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.api.baseUrl}/overseerr/config`);
  }

  getRequests(options?: { status?: number; take?: number; skip?: number }): Observable<{
    results: OverseerrRequest[];
    pageInfo: { pages: number; results: number };
  }> {
    const params: any = {};
    if (options?.status !== undefined) params.status = options.status;
    if (options?.take !== undefined) params.take = options.take;
    if (options?.skip !== undefined) params.skip = options.skip;

    return this.http.get<{ results: OverseerrRequest[]; pageInfo: { pages: number; results: number } }>(
      `${this.api.baseUrl}/overseerr/requests`,
      { params }
    );
  }

  getPendingCount(): Observable<{ pending: number }> {
    return this.http.get<{ pending: number }>(`${this.api.baseUrl}/overseerr/requests/count`);
  }

  approveRequest(requestId: number): Observable<{ success: boolean; request: OverseerrRequest }> {
    return this.http.post<{ success: boolean; request: OverseerrRequest }>(`${this.api.baseUrl}/overseerr/requests/${requestId}/approve`, {});
  }

  declineRequest(requestId: number): Observable<{ success: boolean; request: OverseerrRequest }> {
    return this.http.post<{ success: boolean; request: OverseerrRequest }>(`${this.api.baseUrl}/overseerr/requests/${requestId}/decline`, {});
  }

  getStats(): Observable<OverseerrStats> {
    return this.http.get<OverseerrStats>(`${this.api.baseUrl}/overseerr/stats`);
  }
}
