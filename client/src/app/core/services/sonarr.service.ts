import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SonarrConfig,
  SonarrTestResult,
  SonarrMissingResponse,
  SonarrUpcomingResponse,
  SonarrUpgradesResponse,
  SonarrDowngradesResponse,
  SonarrStats,
  SonarrSearchResult,
  SonarrReleasesResponse,
  SonarrDownloadResult
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class SonarrService {
  private readonly baseUrl = '/api/sonarr';

  constructor(private http: HttpClient) {}

  getConfig(): Observable<{ config: SonarrConfig | null }> {
    return this.http.get<{ config: SonarrConfig | null }>(`${this.baseUrl}/config`);
  }

  saveConfig(host: string, apiKey: string, maxEpisodeSize?: number): Observable<{ success: boolean; config: SonarrConfig }> {
    return this.http.post<{ success: boolean; config: SonarrConfig }>(`${this.baseUrl}/config`, {
      host,
      apiKey,
      maxEpisodeSize
    });
  }

  updateConfig(maxEpisodeSize: number): Observable<{ success: boolean; config: SonarrConfig }> {
    return this.http.patch<{ success: boolean; config: SonarrConfig }>(`${this.baseUrl}/config`, {
      maxEpisodeSize
    });
  }

  deleteConfig(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/config`);
  }

  testConnection(host: string, apiKey: string): Observable<SonarrTestResult> {
    return this.http.post<SonarrTestResult>(`${this.baseUrl}/test`, {
      host,
      apiKey
    });
  }

  getStats(): Observable<SonarrStats> {
    return this.http.get<SonarrStats>(`${this.baseUrl}/stats`);
  }

  getMissing(page = 1, pageSize = 50): Observable<SonarrMissingResponse> {
    return this.http.get<SonarrMissingResponse>(`${this.baseUrl}/missing`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getUpcoming(page = 1, pageSize = 50): Observable<SonarrUpcomingResponse> {
    return this.http.get<SonarrUpcomingResponse>(`${this.baseUrl}/upcoming`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getUpgrades(page = 1, pageSize = 50): Observable<SonarrUpgradesResponse> {
    return this.http.get<SonarrUpgradesResponse>(`${this.baseUrl}/upgrades`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getDowngrades(): Observable<SonarrDowngradesResponse> {
    return this.http.get<SonarrDowngradesResponse>(`${this.baseUrl}/downgrades`);
  }

  triggerSearch(sonarrId: number): Observable<SonarrSearchResult> {
    return this.http.post<SonarrSearchResult>(`${this.baseUrl}/search/${sonarrId}`, {});
  }

  getSearchResults(episodeId: number): Observable<SonarrReleasesResponse> {
    return this.http.get<SonarrReleasesResponse>(`${this.baseUrl}/search/${episodeId}/results`);
  }

  downloadRelease(guid: string, indexerId: number): Observable<SonarrDownloadResult> {
    return this.http.post<SonarrDownloadResult>(`${this.baseUrl}/download`, { guid, indexerId });
  }
}
