import { MediaInfo, Pagination } from './movie.model';

export interface TVShow {
  id: string;
  plexId: string;
  
  title: string;
  originalTitle?: string;
  year?: number;
  summary?: string;
  tagline?: string;
  contentRating?: string;
  rating?: number;
  studio?: string;
  
  imdbId?: string;
  tmdbId?: string;
  tvdbId?: string;
  
  posterUrl?: string;
  artUrl?: string;
  thumbUrl?: string;
  bannerUrl?: string;
  
  genres?: string[];
  
  seasonCount?: number;
  episodeCount?: number;
  totalFileSize?: number;
  
  dominantResolution?: string;
  dominantVideoCodec?: string;
  
  libraryName?: string;
  addedAt?: string;
  
  seasons?: SeasonListItem[];
}

export interface TVShowListItem {
  id: string;
  plexId: string;
  title: string;
  year?: number;
  posterUrl?: string;
  seasonCount?: number;
  episodeCount?: number;
  dominantResolution?: string;
  dominantVideoCodec?: string;
  totalFileSize?: number;
}

export interface Season {
  id: string;
  plexId: string;
  showId: string;
  
  title: string;
  seasonNumber: number;
  summary?: string;
  
  posterUrl?: string;
  
  episodeCount?: number;
  totalFileSize?: number;
}

export interface SeasonListItem {
  id: string;
  seasonNumber: number;
  title: string;
  episodeCount?: number;
  posterUrl?: string;
}

export interface SeasonWithEpisodes {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: EpisodeListItem[];
}

export interface Episode {
  id: string;
  plexId: string;
  showId: string;
  seasonId: string;
  
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  summary?: string;
  contentRating?: string;
  rating?: number;
  
  thumbUrl?: string;
  
  directors?: string[];
  writers?: string[];
  
  media?: MediaInfo;
  
  originallyAiredAt?: string;
  addedAt?: string;
}

export interface EpisodeListItem {
  id: string;
  episodeNumber: number;
  title: string;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  fileSize?: number;
  duration?: number;
}

export interface ShowsResponse {
  shows: TVShowListItem[];
  pagination: Pagination;
}

export interface ShowDetailResponse {
  show: TVShow;
}

export interface SeasonResponse {
  season: SeasonWithEpisodes;
}
