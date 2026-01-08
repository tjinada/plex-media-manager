export interface StatsOverview {
  totalMovies: number;
  totalShows: number;
  totalEpisodes: number;
  totalStorage: number;
}

export interface DistributionData {
  [key: string]: number;
}

export interface ResolutionDistribution {
  movies: DistributionData;
  episodes: DistributionData;
}

export interface CodecDistribution {
  video: {
    movies: DistributionData;
    episodes: DistributionData;
  };
  audio: {
    movies: DistributionData;
    episodes: DistributionData;
  };
}

export interface ContainerDistribution {
  movies: DistributionData;
  episodes: DistributionData;
}

export interface TopMovie {
  id: string;
  title: string;
  year: number;
  fileSize: number;
  resolution: string;
  videoCodec: string;
}

export interface TopEpisode {
  id: string;
  title: string;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  fileSize: number;
  resolution: string;
  videoCodec: string;
}

export interface ShowStorage {
  id: string;
  title: string;
  totalSize: number;
  episodeCount: number;
}

export interface StorageStats {
  byResolution: DistributionData;
  byType: {
    movies: number;
    episodes: number;
  };
  topMovies: TopMovie[];
  topEpisodes: TopEpisode[];
  byShow: ShowStorage[];
}
