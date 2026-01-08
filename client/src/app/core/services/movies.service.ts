import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MoviesResponse, Movie } from '../models';

export interface MovieQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  resolution?: string;
  videoCodec?: string;
  container?: string;
  minSize?: number;
  maxSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MoviesService {
  constructor(private api: ApiService) {}

  /**
   * Get all movies with optional filtering
   */
  getMovies(params: MovieQueryParams = {}): Observable<MoviesResponse> {
    return this.api.get<MoviesResponse>('/movies', params as Record<string, string | number | boolean>);
  }

  /**
   * Get movie by ID
   */
  getMovie(id: string): Observable<{ movie: Movie }> {
    return this.api.get<{ movie: Movie }>(`/movies/${id}`);
  }
}
