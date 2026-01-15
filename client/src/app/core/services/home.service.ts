import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  HomeData,
  StreamingSession,
  DownloadItem,
  QuickStats,
  ActivityResponse
} from '@core/models/home.model';

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
}
