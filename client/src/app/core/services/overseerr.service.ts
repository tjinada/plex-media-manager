import { Injectable } from '@angular/core';
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
  constructor(private api: ApiService) {}

  getConfig(): Observable<{ config: OverseerrConfig | null }> {
    return this.api.get<{ config: OverseerrConfig | null }>('/overseerr/config');
  }

  testConnection(host: string, apiKey: string): Observable<{ success: boolean; version?: string }> {
    return this.api.post<{ success: boolean; version?: string }>('/overseerr/test', { host, apiKey });
  }

  saveConfig(host: string, apiKey: string): Observable<{ success: boolean; config: OverseerrConfig }> {
    return this.api.post<{ success: boolean; config: OverseerrConfig }>('/overseerr/config', { host, apiKey });
  }

  deleteConfig(): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>('/overseerr/config');
  }

  getRequests(options?: { status?: number; take?: number; skip?: number }): Observable<{
    results: OverseerrRequest[];
    pageInfo: { pages: number; results: number };
  }> {
    const params: Record<string, string | number | boolean> = {};
    if (options?.status !== undefined) params['status'] = options.status;
    if (options?.take !== undefined) params['take'] = options.take;
    if (options?.skip !== undefined) params['skip'] = options.skip;

    return this.api.get<{ results: OverseerrRequest[]; pageInfo: { pages: number; results: number } }>(
      '/overseerr/requests',
      params
    );
  }

  getPendingCount(): Observable<{ pending: number }> {
    return this.api.get<{ pending: number }>('/overseerr/requests/count');
  }

  approveRequest(requestId: number): Observable<{ success: boolean; request: OverseerrRequest }> {
    return this.api.post<{ success: boolean; request: OverseerrRequest }>(`/overseerr/requests/${requestId}/approve`);
  }

  declineRequest(requestId: number): Observable<{ success: boolean; request: OverseerrRequest }> {
    return this.api.post<{ success: boolean; request: OverseerrRequest }>(`/overseerr/requests/${requestId}/decline`);
  }

  getStats(): Observable<OverseerrStats> {
    return this.api.get<OverseerrStats>('/overseerr/stats');
  }
}
