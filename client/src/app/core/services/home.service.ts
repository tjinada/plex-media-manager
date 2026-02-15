import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap, finalize } from 'rxjs';
import {
  StreamingSession,
  DownloadItem,
  QuickStats,
  ActivityResponse,
  CalendarResponse,
  ServiceShortcut,
  RecentActivity
} from '@core/models/home.model';
import { OverseerrRequest } from './overseerr.service';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private apiUrl = '/api/home';

  // ===== Cached Data (persists between navigations) =====
  private streamingSubject = new BehaviorSubject<StreamingSession[]>([]);
  private downloadsSubject = new BehaviorSubject<DownloadItem[]>([]);
  private statsSubject = new BehaviorSubject<QuickStats | null>(null);
  private activitySubject = new BehaviorSubject<RecentActivity[]>([]);
  private shortcutsSubject = new BehaviorSubject<ServiceShortcut[]>([]);
  private calendarSubject = new BehaviorSubject<CalendarResponse | null>(null);
  private requestsSubject = new BehaviorSubject<OverseerrRequest[]>([]);
  private pendingCountSubject = new BehaviorSubject<number>(0);

  // ===== Per-Section Loading Flags =====
  private streamingLoadingSubject = new BehaviorSubject<boolean>(false);
  private downloadsLoadingSubject = new BehaviorSubject<boolean>(false);
  private statsLoadingSubject = new BehaviorSubject<boolean>(false);
  private activityLoadingSubject = new BehaviorSubject<boolean>(false);
  private shortcutsLoadingSubject = new BehaviorSubject<boolean>(false);
  private calendarLoadingSubject = new BehaviorSubject<boolean>(false);
  private requestsLoadingSubject = new BehaviorSubject<boolean>(false);

  // ===== Public Observables =====
  streaming$ = this.streamingSubject.asObservable();
  downloads$ = this.downloadsSubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  activity$ = this.activitySubject.asObservable();
  shortcuts$ = this.shortcutsSubject.asObservable();
  calendar$ = this.calendarSubject.asObservable();
  requests$ = this.requestsSubject.asObservable();
  pendingCount$ = this.pendingCountSubject.asObservable();

  streamingLoading$ = this.streamingLoadingSubject.asObservable();
  downloadsLoading$ = this.downloadsLoadingSubject.asObservable();
  statsLoading$ = this.statsLoadingSubject.asObservable();
  activityLoading$ = this.activityLoadingSubject.asObservable();
  shortcutsLoading$ = this.shortcutsLoadingSubject.asObservable();
  calendarLoading$ = this.calendarLoadingSubject.asObservable();
  requestsLoading$ = this.requestsLoadingSubject.asObservable();

  /** Whether any section has ever loaded successfully */
  hasLoadedOnce = false;

  constructor(private http: HttpClient) {}

  // ===== Refresh All (fire-and-forget, non-blocking) =====

  refreshAll(): void {
    this.refreshStreaming();
    this.refreshDownloads();
    this.refreshStats();
    this.refreshActivity();
    this.refreshShortcuts();
    this.refreshCalendar();
    this.refreshRequests();
  }

  // ===== Individual Section Refreshes =====

  refreshStreaming(): void {
    if (this.streamingLoadingSubject.value) return;
    this.streamingLoadingSubject.next(true);

    this.http.get<StreamingSession[]>(`${this.apiUrl}/streaming`).pipe(
      tap(data => {
        this.streamingSubject.next(data);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh streaming:', err);
        return of(null);
      }),
      finalize(() => this.streamingLoadingSubject.next(false))
    ).subscribe();
  }

  refreshDownloads(): void {
    if (this.downloadsLoadingSubject.value) return;
    this.downloadsLoadingSubject.next(true);

    this.http.get<DownloadItem[]>(`${this.apiUrl}/downloads`).pipe(
      tap((data: any) => {
        const items = Array.isArray(data) ? data : (data.items || []);
        this.downloadsSubject.next(items);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh downloads:', err);
        return of(null);
      }),
      finalize(() => this.downloadsLoadingSubject.next(false))
    ).subscribe();
  }

  refreshStats(): void {
    if (this.statsLoadingSubject.value) return;
    this.statsLoadingSubject.next(true);

    this.http.get<QuickStats>(`${this.apiUrl}/stats`).pipe(
      tap(data => {
        this.statsSubject.next(data);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh stats:', err);
        return of(null);
      }),
      finalize(() => this.statsLoadingSubject.next(false))
    ).subscribe();
  }

  refreshActivity(limit = 10, offset = 0, type: 'watched' | 'downloaded' | 'added' | 'all' = 'all'): void {
    if (this.activityLoadingSubject.value) return;
    this.activityLoadingSubject.next(true);

    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (type !== 'all') {
      params = params.set('type', type);
    }

    this.http.get<ActivityResponse>(`${this.apiUrl}/activity`, { params }).pipe(
      tap(data => {
        this.activitySubject.next(data.activities);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh activity:', err);
        return of(null);
      }),
      finalize(() => this.activityLoadingSubject.next(false))
    ).subscribe();
  }

  refreshShortcuts(): void {
    if (this.shortcutsLoadingSubject.value) return;
    this.shortcutsLoadingSubject.next(true);

    this.http.get<{ shortcuts: ServiceShortcut[] }>(`${this.apiUrl}/shortcuts`).pipe(
      tap(data => {
        this.shortcutsSubject.next(data.shortcuts);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh shortcuts:', err);
        return of(null);
      }),
      finalize(() => this.shortcutsLoadingSubject.next(false))
    ).subscribe();
  }

  refreshCalendar(days = 7): void {
    if (this.calendarLoadingSubject.value) return;
    this.calendarLoadingSubject.next(true);

    const params = new HttpParams().set('days', days.toString());

    this.http.get<CalendarResponse>(`${this.apiUrl}/calendar`, { params }).pipe(
      tap(data => {
        this.calendarSubject.next(data);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh calendar:', err);
        return of(null);
      }),
      finalize(() => this.calendarLoadingSubject.next(false))
    ).subscribe();
  }

  refreshRequests(take = 10): void {
    if (this.requestsLoadingSubject.value) return;
    this.requestsLoadingSubject.next(true);

    const params = new HttpParams().set('take', take.toString());

    this.http.get<{ results: OverseerrRequest[]; pageInfo: any }>(`${this.apiUrl}/requests`, { params }).pipe(
      tap(data => {
        this.requestsSubject.next(data.results);
        const pending = data.results.filter(r => r.status === 'pending').length;
        this.pendingCountSubject.next(pending);
        this.hasLoadedOnce = true;
      }),
      catchError(err => {
        console.error('Failed to refresh requests:', err);
        return of(null);
      }),
      finalize(() => this.requestsLoadingSubject.next(false))
    ).subscribe();
  }

  // ===== Direct Update Methods (for WebSocket pushes) =====

  updateStreaming(sessions: StreamingSession[]): void {
    this.streamingSubject.next(sessions);
  }

  updateDownloads(downloads: DownloadItem[]): void {
    this.downloadsSubject.next(downloads);
  }

  updateStats(stats: QuickStats): void {
    this.statsSubject.next(stats);
  }

  prependActivity(activity: RecentActivity): void {
    const current = this.activitySubject.value;
    this.activitySubject.next([activity, ...current.slice(0, 9)]);
  }

  updatePendingCount(count: number): void {
    this.pendingCountSubject.next(count);
  }

  // ===== Paginated Activity (for modal — returns Observable) =====

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
