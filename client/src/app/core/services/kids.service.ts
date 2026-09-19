import { Injectable } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  KidsConfig,
  KidsConfigResponse,
  KidsMapping,
  PlexSection,
  QuarantineBucket,
  ReconcileSummary
} from '../models';

export interface SetKidsLabelResponse {
  success: boolean;
  ratingKey: string;
  isKids: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class KidsService {
  // Shared by every toggle on a page, so the config is fetched once.
  private config$: Observable<KidsConfigResponse> | null = null;

  constructor(private api: ApiService) {}

  getConfig(): Observable<KidsConfigResponse> {
    if (!this.config$) {
      this.config$ = this.api.get<KidsConfigResponse>('/kids/config').pipe(shareReplay(1));
    }
    return this.config$;
  }

  /** True when kids sync is configured and switched on. */
  isEnabled(): Observable<boolean> {
    return this.getConfig().pipe(map(res => !!res.config?.enabled));
  }

  saveConfig(config: {
    enabled?: boolean;
    mappings?: KidsMapping[];
    maxRemovalsPerRun?: number;
  }): Observable<{ success: boolean; config: KidsConfig }> {
    return this.api
      .post<{ success: boolean; config: KidsConfig }>('/kids/config', config)
      .pipe(tap(() => (this.config$ = null)));
  }

  getSections(): Observable<PlexSection[]> {
    return this.api.get<PlexSection[]>('/kids/sections');
  }

  reconcile(dryRun: boolean): Observable<ReconcileSummary> {
    const query = dryRun ? '?dryRun=true' : '';
    return this.api
      .post<ReconcileSummary>(`/kids/reconcile${query}`)
      .pipe(tap(() => (this.config$ = null)));
  }

  setLabel(plexId: string, isKids: boolean): Observable<SetKidsLabelResponse> {
    return this.api.put<SetKidsLabelResponse>(`/kids/items/${plexId}/label`, { isKids });
  }

  getQuarantine(): Observable<QuarantineBucket[]> {
    return this.api.get<QuarantineBucket[]>('/kids/quarantine');
  }
}
