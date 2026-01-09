import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WatchHistoryAnalysis,
  StaleMoviesResponse,
  StaleEpisodesResponse,
  StaleShowsResponse
} from '../models/watch-history.model';

@Injectable({
  providedIn: 'root'
})
export class WatchHistoryService {
  private apiUrl = '/api/watch-history';

  constructor(private http: HttpClient) {}

  getAnalysis(options: {
    staleThresholdDays?: number;
    minAgeToConsiderDays?: number;
  } = {}): Observable<WatchHistoryAnalysis> {
    let params = new HttpParams();
    if (options.staleThresholdDays) {
      params = params.set('staleThresholdDays', options.staleThresholdDays.toString());
    }
    if (options.minAgeToConsiderDays) {
      params = params.set('minAgeToConsiderDays', options.minAgeToConsiderDays.toString());
    }
    return this.http.get<WatchHistoryAnalysis>(`${this.apiUrl}/analysis`, { params });
  }

  getMovies(options: {
    staleThresholdDays?: number;
    minAgeToConsiderDays?: number;
    filter?: 'all' | 'never' | 'stale' | 'active';
    sortBy?: 'fileSize' | 'addedAt' | 'lastViewedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Observable<StaleMoviesResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<StaleMoviesResponse>(`${this.apiUrl}/movies`, { params });
  }

  getEpisodes(options: {
    staleThresholdDays?: number;
    minAgeToConsiderDays?: number;
    filter?: 'all' | 'never' | 'stale' | 'active';
    sortBy?: 'fileSize' | 'addedAt' | 'lastViewedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Observable<StaleEpisodesResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<StaleEpisodesResponse>(`${this.apiUrl}/episodes`, { params });
  }

  getShows(options: {
    staleThresholdDays?: number;
    minAgeToConsiderDays?: number;
    filter?: 'all' | 'never' | 'stale' | 'active';
    sortBy?: 'staleEpisodes' | 'activeEpisodes' | 'totalEpisodes' | 'staleSize' | 'title';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Observable<StaleShowsResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<StaleShowsResponse>(`${this.apiUrl}/shows`, { params });
  }
}
