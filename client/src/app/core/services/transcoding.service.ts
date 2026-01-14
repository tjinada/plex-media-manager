import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TranscodingSummary,
  DecisionOverTime,
  TranscodeReason,
  DeviceStats,
  FormatData,
  FormatCombination,
  MediaTranscodeResponse,
  TranscodingUser,
  Recommendation,
  SessionsResponse,
  TimePeriod,
  CodecMediaResponse
} from '../models/transcoding.model';

@Injectable({
  providedIn: 'root'
})
export class TranscodingService {
  private baseUrl = '/api/transcoding';

  constructor(private http: HttpClient) {}

  private buildParams(period: TimePeriod, userId?: string | null): HttpParams {
    let params = new HttpParams().set('period', period);
    if (userId) {
      params = params.set('userId', userId);
    }
    return params;
  }

  getSummary(period: TimePeriod = '30d', userId?: string | null): Observable<TranscodingSummary> {
    const params = this.buildParams(period, userId);
    return this.http.get<TranscodingSummary>(`${this.baseUrl}/summary`, { params });
  }

  getDecisionsOverTime(period: TimePeriod = '30d', userId?: string | null): Observable<DecisionOverTime[]> {
    const params = this.buildParams(period, userId);
    return this.http.get<DecisionOverTime[]>(`${this.baseUrl}/decisions-over-time`, { params });
  }

  getTranscodeReasons(period: TimePeriod = '30d', userId?: string | null): Observable<TranscodeReason[]> {
    const params = this.buildParams(period, userId);
    return this.http.get<TranscodeReason[]>(`${this.baseUrl}/reasons`, { params });
  }

  getByDevice(period: TimePeriod = '30d', userId?: string | null): Observable<DeviceStats[]> {
    const params = this.buildParams(period, userId);
    return this.http.get<DeviceStats[]>(`${this.baseUrl}/by-device`, { params });
  }

  getByFormat(period: TimePeriod = '30d', userId?: string | null): Observable<FormatData> {
    const params = this.buildParams(period, userId);
    return this.http.get<FormatData>(`${this.baseUrl}/by-format`, { params });
  }

  getCombinations(period: TimePeriod = '30d', userId?: string | null): Observable<FormatCombination[]> {
    const params = this.buildParams(period, userId);
    return this.http.get<FormatCombination[]>(`${this.baseUrl}/combinations`, { params });
  }

  getByMedia(
    period: TimePeriod = '30d',
    userId?: string | null,
    page: number = 1,
    limit: number = 20
  ): Observable<MediaTranscodeResponse> {
    let params = this.buildParams(period, userId);
    params = params.set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<MediaTranscodeResponse>(`${this.baseUrl}/by-media`, { params });
  }

  getUsers(): Observable<TranscodingUser[]> {
    return this.http.get<TranscodingUser[]>(`${this.baseUrl}/users`);
  }

  getRecommendations(period: TimePeriod = '30d', userId?: string | null): Observable<Recommendation[]> {
    const params = this.buildParams(period, userId);
    return this.http.get<Recommendation[]>(`${this.baseUrl}/recommendations`, { params });
  }

  getSessions(
    period: TimePeriod = '30d',
    userId?: string | null,
    decision?: string,
    page: number = 1,
    limit: number = 50
  ): Observable<SessionsResponse> {
    let params = this.buildParams(period, userId);
    params = params.set('page', page.toString()).set('limit', limit.toString());
    if (decision) {
      params = params.set('decision', decision);
    }
    return this.http.get<SessionsResponse>(`${this.baseUrl}/sessions`, { params });
  }

  getMediaByCodec(
    codecType: 'video' | 'audio',
    codecValue: string,
    period: TimePeriod = '30d',
    userId?: string | null,
    page: number = 1,
    limit: number = 20
  ): Observable<CodecMediaResponse> {
    let params = this.buildParams(period, userId);
    params = params
      .set('codecType', codecType)
      .set('codecValue', codecValue)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<CodecMediaResponse>(`${this.baseUrl}/media-by-codec`, { params });
  }
}
