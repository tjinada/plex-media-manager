import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ShowsResponse, EpisodesResponse, TVShow, SeasonWithEpisodes, Episode, SeasonListItem } from '../models';

export interface ShowQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  minSize?: number;
  maxSize?: number;
}

export interface EpisodeQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  showId?: string;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  minSize?: number;
  maxSize?: number;
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
    // Clean up undefined values
    const cleanParams: Record<string, string | number | boolean> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    });
    return this.api.get<ShowsResponse>('/shows', cleanParams);
  }

  /**
   * Get all episodes with optional filtering
   */
  getEpisodes(params: EpisodeQueryParams = {}): Observable<EpisodesResponse> {
    // Clean up undefined values
    const cleanParams: Record<string, string | number | boolean> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    });
    return this.api.get<EpisodesResponse>('/episodes', cleanParams);
  }

  /**
   * Get show by ID with seasons
   */
  getShow(id: string): Observable<{ show: TVShow & { seasons: SeasonListItem[] } }> {
    return this.api.get<{ show: TVShow & { seasons: SeasonListItem[] } }>(`/shows/${id}`);
  }

  /**
   * Get season with episodes
   */
  getSeason(showId: string, seasonNumber: number): Observable<{ season: SeasonWithEpisodes }> {
    return this.api.get<{ season: SeasonWithEpisodes }>(`/shows/${showId}/seasons/${seasonNumber}`);
  }

  /**
   * Get episode details
   */
  getEpisode(id: string): Observable<{ episode: Episode }> {
    return this.api.get<{ episode: Episode }>(`/episodes/${id}`);
  }
}
