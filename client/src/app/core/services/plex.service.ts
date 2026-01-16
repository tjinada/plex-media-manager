import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { 
  PlexServer, 
  PlexServerResponse, 
  ConnectServerRequest, 
  TestConnectionResponse 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class PlexService {
  constructor(private api: ApiService) {}

  /**
   * Get connected Plex server info
   */
  getServer(): Observable<PlexServerResponse> {
    return this.api.get<PlexServerResponse>('/server');
  }

  /**
   * Connect to a Plex server
   */
  connectServer(data: ConnectServerRequest): Observable<{ success: boolean; server: PlexServer }> {
    return this.api.post<{ success: boolean; server: PlexServer }>('/server', data);
  }

  /**
   * Test connection to Plex server
   */
  testConnection(host: string, token: string): Observable<TestConnectionResponse> {
    return this.api.post<TestConnectionResponse>('/server/test', { host, token });
  }

  /**
   * Disconnect Plex server
   */
  disconnectServer(serverId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/server/${serverId}`);
  }

  /**
   * Update external URL for Plex server
   */
  updateExternalUrl(externalUrl: string | null): Observable<{ server: PlexServer }> {
    return this.api.patch<{ server: PlexServer }>('/server/external-url', { externalUrl });
  }

  /**
   * Get Plex image URL with proxy
   */
  getImageUrl(path: string | undefined | null): string {
    if (!path) {
      return '/assets/images/placeholder-poster.svg';
    }
    // Images are proxied through our backend
    return `/api/server/image?path=${encodeURIComponent(path)}`;
  }
}
