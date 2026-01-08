import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ShowsResponse, TVShow, Season, Episode } from '../models';

export interface ShowQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  resolution?: string;
  videoCodec?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShowsService {
  constructor(private api: ApiService) {}

  /**
   * Get all TV shows with optional filtering
   */
  getShows(params: ShowQueryParams = {}): Observable<ShowsResponse> {
    return this.api.get<ShowsResponse>('/shows', params as Record<string, string | number | boolean>);
  }

  /**
   * Get show by ID with seasons
   */
  getShow(id: string): Observable<{ show: TVShow & { seasons: Season[] } }> {
    return this.api.get<{ show: TVShow & { seasons: Season[] } }>(`/shows/${id}`);
  }

  /**
   * Get season with episodes
   */
  getSeason(showId: string, seasonNumber: number): Observable<{ season: Season & { episodes: Episode[] } }> {
    return this.api.get<{ season: Season & { episodes: Episode[] } }>(`/shows/${showId}/seasons/${seasonNumber}`);
  }

  /**
   * Get episode details
   */
  getEpisode(id: string): Observable<{ episode: Episode }> {
    return this.api.get<{ episode: Episode }>(`/episodes/${id}`);
  }
}
