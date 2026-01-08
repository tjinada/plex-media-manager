import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CompatibilityAnalysis,
  CompatibilityIssuesResponse,
  CompatibilityRulesResponse
} from '../models/compatibility.model';

@Injectable({
  providedIn: 'root'
})
export class CompatibilityService {
  private apiUrl = '/api/compatibility';

  constructor(private http: HttpClient) {}

  getRules(): Observable<CompatibilityRulesResponse> {
    return this.http.get<CompatibilityRulesResponse>(`${this.apiUrl}/rules`);
  }

  getAnalysis(): Observable<CompatibilityAnalysis> {
    return this.http.get<CompatibilityAnalysis>(`${this.apiUrl}/analysis`);
  }

  getIssues(options: {
    type?: 'all' | 'movies' | 'episodes';
    severity?: 'all' | 'high' | 'medium' | 'low';
    ruleId?: string | null;
    sortBy?: 'severity' | 'fileSize' | 'title';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Observable<CompatibilityIssuesResponse> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<CompatibilityIssuesResponse>(`${this.apiUrl}/issues`, { params });
  }
}
