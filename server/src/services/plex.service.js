const axios = require('axios');
const config = require('../config/environment');

class PlexService {
  constructor(host, token) {
    this.host = host?.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
    this.headers = {
      'X-Plex-Client-Identifier': config.plex.clientIdentifier,
      'X-Plex-Product': config.plex.product,
      'X-Plex-Version': config.plex.version,
      'X-Plex-Platform': config.plex.platform,
      'X-Plex-Token': token,
      'Accept': 'application/json'
    };
  }

  /**
   * Make a request to the Plex server
   */
  async request(endpoint, options = {}) {
    const url = `${this.host}${endpoint}`;
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: this.headers,
      params: options.params,
      timeout: 30000
    });
    return response.data;
  }

  /**
   * Test connection to Plex server
   */
  async testConnection() {
    const data = await this.request('/');
    const mediaContainer = data.MediaContainer;
    
    return {
      name: mediaContainer.friendlyName,
      machineId: mediaContainer.machineIdentifier,
      version: mediaContainer.version,
      platform: mediaContainer.platform
    };
  }

  /**
   * Get all libraries (sections)
   */
  async getLibraries() {
    const data = await this.request('/library/sections');
    return data.MediaContainer.Directory || [];
  }

  /**
   * Get all items from a library section
   */
  async getLibraryItems(sectionId) {
    const data = await this.request(`/library/sections/${sectionId}/all`);
    return data.MediaContainer.Metadata || [];
  }

  /**
   * Get detailed metadata for an item (includes media info)
   */
  async getMetadata(ratingKey) {
    const data = await this.request(`/library/metadata/${ratingKey}`);
    const items = data.MediaContainer.Metadata || [];
    return items[0] || null;
  }

  /**
   * Get children of an item (seasons for shows, episodes for seasons)
   */
  async getChildren(ratingKey) {
    const data = await this.request(`/library/metadata/${ratingKey}/children`);
    return data.MediaContainer.Metadata || [];
  }

  /**
   * Get all movies from Plex (finds movie libraries and fetches all)
   */
  async getAllMovies() {
    const libraries = await this.getLibraries();
    const movieLibraries = libraries.filter(lib => lib.type === 'movie');
    
    const allMovies = [];
    
    for (const library of movieLibraries) {
      const movies = await this.getLibraryItems(library.key);
      
      // Add library info to each movie
      movies.forEach(movie => {
        movie.libraryId = library.key;
        movie.libraryName = library.title;
      });
      
      allMovies.push(...movies);
    }
    
    return allMovies;
  }

  /**
   * Get all TV shows from Plex
   */
  async getAllShows() {
    const libraries = await this.getLibraries();
    const showLibraries = libraries.filter(lib => lib.type === 'show');
    
    const allShows = [];
    
    for (const library of showLibraries) {
      const shows = await this.getLibraryItems(library.key);
      
      // Add library info to each show
      shows.forEach(show => {
        show.libraryId = library.key;
        show.libraryName = library.title;
      });
      
      allShows.push(...shows);
    }
    
    return allShows;
  }

  /**
   * Get watch history for all users (admin only)
   * Returns aggregated watch data per ratingKey
   */
  async getWatchHistory() {
    try {
      const data = await this.request('/status/sessions/history/all', {
        params: {
          sort: 'viewedAt:desc'
        }
      });
      
      const history = data.MediaContainer?.Metadata || [];
      
      // Aggregate watch data by ratingKey
      // Track the most recent view and total count per item
      const aggregated = {};
      
      for (const entry of history) {
        const key = entry.ratingKey;
        if (!key) continue;
        
        const viewedAt = entry.viewedAt ? new Date(entry.viewedAt * 1000) : null;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            ratingKey: key,
            viewCount: 0,
            lastViewedAt: viewedAt
          };
        }
        
        aggregated[key].viewCount++;
        
        // Keep the most recent view date
        if (viewedAt && (!aggregated[key].lastViewedAt || viewedAt > aggregated[key].lastViewedAt)) {
          aggregated[key].lastViewedAt = viewedAt;
        }
      }
      
      return aggregated;
    } catch (error) {
      console.error('Error fetching watch history:', error.message);
      // Return empty object if endpoint not available (older Plex versions)
      return {};
    }
  }

  /**
   * Parse media info from Plex metadata
   */
  parseMediaInfo(metadata) {
    if (!metadata.Media || !metadata.Media[0]) {
      return null;
    }

    const media = metadata.Media[0];
    const part = media.Part?.[0];
    const streams = part?.Stream || [];

    // Find video stream
    const videoStream = streams.find(s => s.streamType === 1);
    
    // Find primary audio stream
    const audioStream = streams.find(s => s.streamType === 2);
    
    // Get all audio tracks with detailed info
    const audioTracks = streams
      .filter(s => s.streamType === 2)
      .map(s => ({
        codec: s.codec,
        channels: s.channels,
        language: s.language || s.languageCode,
        title: s.displayTitle || s.title,
        bitrate: s.bitrate,
        profile: s.profile,
        // Audio format features (for Atmos, DTS:X detection)
        extendedDisplayTitle: s.extendedDisplayTitle
      }));

    // Get all subtitles
    const subtitles = streams
      .filter(s => s.streamType === 3)
      .map(s => ({
        language: s.language || s.languageCode,
        codec: s.codec,
        forced: s.forced === 1 || s.forced === true,
        title: s.displayTitle || s.title
      }));

    // Extract HDR/Dolby Vision info from video stream
    const hdrInfo = videoStream ? {
      // Dolby Vision
      doviPresent: videoStream.DOVIPresent === true || videoStream.DOVIPresent === 1,
      doviProfile: videoStream.DOVIProfile,
      doviLevel: videoStream.DOVILevel,
      doviVersion: videoStream.DOVIVersion,
      doviBLPresent: videoStream.DOVIBLPresent === true || videoStream.DOVIBLPresent === 1,
      doviELPresent: videoStream.DOVIELPresent === true || videoStream.DOVIELPresent === 1,
      doviRPUPresent: videoStream.DOVIRPUPresent === true || videoStream.DOVIRPUPresent === 1,
      doviBLCompatID: videoStream.DOVIBLCompatID,
      // HDR10/HDR10+
      colorPrimaries: videoStream.colorPrimaries,
      colorTransfer: videoStream.colorTransfer,
      colorSpace: videoStream.colorSpace,
      // Bit depth
      bitDepth: videoStream.bitDepth,
      // Display title often contains HDR info
      displayTitle: videoStream.displayTitle,
      extendedDisplayTitle: videoStream.extendedDisplayTitle
    } : null;

    return {
      videoCodec: media.videoCodec,
      videoProfile: media.videoProfile,
      videoBitrate: videoStream?.bitrate || media.bitrate,
      videoFrameRate: media.videoFrameRate,
      
      width: media.width || videoStream?.width,
      height: media.height || videoStream?.height,
      aspectRatio: media.aspectRatio,
      
      audioCodec: media.audioCodec,
      audioProfile: media.audioProfile,
      audioChannels: media.audioChannels || audioStream?.channels,
      audioBitrate: audioStream?.bitrate,
      
      container: media.container,
      fileSize: part?.size,
      filePath: part?.file,
      fileName: part?.file?.split(/[/\\]/).pop(),
      duration: media.duration || part?.duration,
      bitrate: media.bitrate,
      
      audioTracks,
      subtitles,
      
      // HDR/Dolby Vision info
      hdr: hdrInfo
    };
  }

  /**
   * Parse watch info from Plex metadata
   * This extracts viewCount and lastViewedAt from the item's metadata
   */
  parseWatchInfo(metadata) {
    return {
      viewCount: metadata.viewCount || 0,
      lastViewedAt: metadata.lastViewedAt 
        ? new Date(metadata.lastViewedAt * 1000) 
        : null
    };
  }

  /**
   * Extract IDs from Plex GUID
   * Example GUID: "plex://movie/5d776833e8d6af001f5e7a56"
   * Or with agents: "com.plexapp.agents.imdb://tt0499549?lang=en"
   */
  parseGuids(metadata) {
    const result = {
      imdbId: null,
      tmdbId: null,
      tvdbId: null
    };

    // Check Guid array (newer Plex versions)
    if (metadata.Guid && Array.isArray(metadata.Guid)) {
      for (const guid of metadata.Guid) {
        const id = guid.id || '';
        if (id.startsWith('imdb://')) {
          result.imdbId = id.replace('imdb://', '');
        } else if (id.startsWith('tmdb://')) {
          result.tmdbId = id.replace('tmdb://', '');
        } else if (id.startsWith('tvdb://')) {
          result.tvdbId = id.replace('tvdb://', '');
        }
      }
    }

    // Fallback to legacy guid parsing
    if (metadata.guid) {
      const guid = metadata.guid;
      if (guid.includes('imdb://')) {
        const match = guid.match(/imdb:\/\/([a-z0-9]+)/i);
        if (match) result.imdbId = match[1];
      }
      if (guid.includes('themoviedb://')) {
        const match = guid.match(/themoviedb:\/\/(\d+)/);
        if (match) result.tmdbId = match[1];
      }
      if (guid.includes('thetvdb://')) {
        const match = guid.match(/thetvdb:\/\/(\d+)/);
        if (match) result.tvdbId = match[1];
      }
    }

    return result;
  }

  /**
   * Get image URL with token
   */
  getImageUrl(path) {
    if (!path) return null;
    return `${this.host}${path}?X-Plex-Token=${this.token}`;
  }
}

module.exports = PlexService;
