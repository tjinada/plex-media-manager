export interface MediaInfo {
  videoCodec?: string;
  videoProfile?: string;
  videoBitrate?: number;
  videoFrameRate?: string;
  
  width?: number;
  height?: number;
  resolution?: string;
  aspectRatio?: string;
  
  audioCodec?: string;
  audioProfile?: string;
  audioChannels?: number;
  audioBitrate?: number;
  
  container?: string;
  fileSize?: number;
  filePath?: string;
  fileName?: string;
  duration?: number;
  bitrate?: number;
  
  audioTracks?: AudioTrack[];
  subtitles?: Subtitle[];
}

export interface AudioTrack {
  codec: string;
  channels: number;
  language?: string;
  title?: string;
}

export interface Subtitle {
  language?: string;
  codec: string;
  forced: boolean;
  title?: string;
}

export interface Movie {
  id: string;
  plexId: string;
  
  title: string;
  originalTitle?: string;
  year?: number;
  summary?: string;
  tagline?: string;
  contentRating?: string;
  rating?: number;
  audienceRating?: number;
  studio?: string;
  
  imdbId?: string;
  tmdbId?: string;
  
  posterUrl?: string;
  artUrl?: string;
  thumbUrl?: string;
  
  genres?: string[];
  directors?: string[];
  writers?: string[];
  
  media?: MediaInfo;
  
  libraryName?: string;
  addedAt?: string;
}

export interface MovieListItem {
  id: string;
  plexId: string;
  title: string;
  year?: number;
  posterUrl?: string;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  container?: string;
  fileSize?: number;
  duration?: number;
}

export interface MoviesResponse {
  movies: MovieListItem[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Filter related interfaces
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterState {
  search?: string;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  container?: string;
  minSize?: number;
  maxSize?: number;
}

export interface FilterOptions {
  resolutions: FilterOption[];
  videoCodecs: FilterOption[];
  audioCodecs: FilterOption[];
  containers: FilterOption[];
}
