import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  HomeData,
  StreamingSession,
  DownloadItem,
  QuickStats,
  ActivityResponse,
  CalendarItem,
  CalendarResponse,
  ServiceShortcut
} from '@core/models/home.model';
import { OverseerrRequest } from './overseerr.service';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private apiUrl = '/api/home';

  constructor(private http: HttpClient) {}

  /**
   * Get complete home page data for initial load
   */
  getHomeData(): Observable<HomeData> {
    return this.http.get<HomeData>(this.apiUrl);
  }

  /**
   * Get current streaming sessions only
   */
  getStreamingSessions(): Observable<StreamingSession[]> {
    return this.http.get<StreamingSession[]>(`${this.apiUrl}/streaming`);
  }

  /**
   * Get current download queue only
   */
  getDownloads(): Observable<DownloadItem[]> {
    return this.http.get<DownloadItem[]>(`${this.apiUrl}/downloads`);
  }

  /**
   * Get quick stats only
   */
  getStats(): Observable<QuickStats> {
    return this.http.get<QuickStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Get paginated recent activity
   */
  getActivity(
    limit: number = 10,
    offset: number = 0,
    type: 'watched' | 'downloaded' | 'added' | 'all' = 'all'
  ): Observable<ActivityResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (type !== 'all') {
      params = params.set('type', type);
    }

    return this.http.get<ActivityResponse>(`${this.apiUrl}/activity`, { params });
  }

  /**
   * Get combined calendar from Radarr and Sonarr
   */
  getCalendar(days: number = 7): Observable<CalendarResponse> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<CalendarResponse>(`${this.apiUrl}/calendar`, { params });
  }

  /**
   * Get Overseerr requests for widget
   */
  getRequests(options?: { status?: number; take?: number; skip?: number }): Observable<{
    results: OverseerrRequest[];
    pageInfo: { pages: number; results: number };
  }> {
    let params = new HttpParams();
    if (options?.status !== undefined) params = params.set('status', options.status.toString());
    if (options?.take !== undefined) params = params.set('take', options.take.toString());
    if (options?.skip !== undefined) params = params.set('skip', options.skip.toString());

    return this.http.get<{ results: OverseerrRequest[]; pageInfo: { pages: number; results: number } }>(
      `${this.apiUrl}/requests`,
      { params }
    );
  }

  /**
   * Get configured service shortcuts
   */
  getShortcuts(): Observable<{ shortcuts: ServiceShortcut[] }> {
    return this.http.get<{ shortcuts: ServiceShortcut[] }>(`${this.apiUrl}/shortcuts`);
  }
}
