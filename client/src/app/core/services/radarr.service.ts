import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RadarrConfig,
  RadarrTestResult,
  RadarrMissingResponse,
  RadarrUpgradesResponse,
  RadarrDowngradesResponse,
  RadarrStats,
  RadarrSearchResult
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class RadarrService {
  private readonly baseUrl = '/api/radarr';

  constructor(private http: HttpClient) {}

  getConfig(): Observable<{ config: RadarrConfig | null }> {
    return this.http.get<{ config: RadarrConfig | null }>(`${this.baseUrl}/config`);
  }

  saveConfig(host: string, apiKey: string): Observable<{ success: boolean; config: RadarrConfig }> {
    return this.http.post<{ success: boolean; config: RadarrConfig }>(`${this.baseUrl}/config`, {
      host,
      apiKey
    });
  }

  deleteConfig(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/config`);
  }

  testConnection(host: string, apiKey: string): Observable<RadarrTestResult> {
    return this.http.post<RadarrTestResult>(`${this.baseUrl}/test`, {
      host,
      apiKey
    });
  }

  getStats(): Observable<RadarrStats> {
    return this.http.get<RadarrStats>(`${this.baseUrl}/stats`);
  }

  getMissing(page = 1, pageSize = 50): Observable<RadarrMissingResponse> {
    return this.http.get<RadarrMissingResponse>(`${this.baseUrl}/missing`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getUpgrades(page = 1, pageSize = 50): Observable<RadarrUpgradesResponse> {
    return this.http.get<RadarrUpgradesResponse>(`${this.baseUrl}/upgrades`, {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  getDowngrades(): Observable<RadarrDowngradesResponse> {
    return this.http.get<RadarrDowngradesResponse>(`${this.baseUrl}/downgrades`);
  }

  triggerSearch(radarrId: number): Observable<RadarrSearchResult> {
    return this.http.post<RadarrSearchResult>(`${this.baseUrl}/search/${radarrId}`, {});
  }
}
