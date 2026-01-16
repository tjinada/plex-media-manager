const axios = require('axios');
const { OverseerrConfig } = require('../models');
const { encrypt, decrypt } = require('../config/encryption');

class OverseerrService {
  constructor() {
    this.client = null;
    this.config = null;
  }

  async initialize() {
    const config = await OverseerrConfig.getConfig();
    if (config && config.enabled) {
      this.config = config;
      this.client = axios.create({
        baseURL: `${config.host}/api/v1`,
        headers: {
          'X-Api-Key': decrypt(config.apiKey),
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    }
    return this;
  }

  async testConnection(host, apiKey) {
    try {
      const response = await axios.get(`${host}/api/v1/status`, {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return {
        success: true,
        version: response.data.version,
        appName: 'Overseerr'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to connect to Overseerr');
    }
  }

  async saveConfig(host, apiKey, externalUrl) {
    const testResult = await this.testConnection(host, apiKey);
    
    const configData = {
      host: host.replace(/\/$/, ''),
      externalUrl: externalUrl ? externalUrl.replace(/\/$/, '') : null,
      apiKey: encrypt(apiKey),
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    };

    const config = await OverseerrConfig.saveConfig(configData);

    await this.initialize();
    return config;
  }

  async updateConfig(updates) {
    const config = await OverseerrConfig.getConfig();
    if (!config) throw new Error('Overseerr not configured');

    if (updates.externalUrl !== undefined) {
      config.externalUrl = updates.externalUrl ? updates.externalUrl.replace(/\/$/, '') : null;
    }

    await config.save();
    this.config = config;
    return config;
  }

  async getConfig() {
    const config = await OverseerrConfig.getConfig();
    if (!config) return null;
    
    return {
      host: config.host,
      externalUrl: config.externalUrl || null,
      enabled: config.enabled,
      isConnected: config.isConnected,
      version: config.version,
      lastCheckedAt: config.lastCheckedAt
    };
  }

  async deleteConfig() {
    await OverseerrConfig.deleteMany({});
    this.client = null;
    this.config = null;
  }

  getWebUrl() {
    return this.config?.host || null;
  }

  /**
   * Get all requests with optional filters
   */
  async getRequests(options = {}) {
    if (!this.client) await this.initialize();
    if (!this.client) return { results: [], pageInfo: { pages: 0, results: 0 } };

    try {
      const { status, take = 20, skip = 0 } = options;
      const params = { take, skip };
      
      if (status) {
        // Status: 1 = pending, 2 = approved, 3 = declined, 4 = available
        params.filter = status;
      }

      const response = await this.client.get('/request', { params });
      
      // Fetch media details for each request to get titles
      // Using Promise.allSettled to ensure one failure doesn't break all requests
      const resultsWithDetails = await Promise.all(
        response.data.results.map(async (req) => {
          try {
            // Determine the media type - Overseerr uses 'movie' or 'tv'
            const mediaType = req.type === 'movie' ? 'movie' : 'tv';
            const tmdbId = req.media?.tmdbId;
            
            if (tmdbId) {
              const mediaDetails = await this.getMediaDetails(tmdbId, mediaType);
              return this.mapRequest(req, mediaDetails);
            }
            return this.mapRequest(req, null);
          } catch (error) {
            console.error(`Error processing request ${req.id}:`, error.message);
            return this.mapRequest(req, null);
          }
        })
      );
      
      return {
        results: resultsWithDetails,
        pageInfo: response.data.pageInfo
      };
    } catch (error) {
      console.error('Error fetching Overseerr requests:', error.message);
      return { results: [], pageInfo: { pages: 0, results: 0 } };
    }
  }

  /**
   * Get media details (title, poster) from Overseerr's TMDB proxy
   * This fetches full movie/TV details including title and poster
   */
  async getMediaDetails(tmdbId, type) {
    if (!this.client || !tmdbId) {
      console.log(`getMediaDetails called with invalid params: tmdbId=${tmdbId}, type=${type}`);
      return null;
    }

    try {
      // Overseerr proxies TMDB API calls through /movie/:id and /tv/:id
      const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
      const response = await this.client.get(endpoint);
      
      const data = response.data;
      return {
        title: data.title || data.name || data.originalTitle || data.originalName,
        posterPath: data.posterPath,
        backdropPath: data.backdropPath,
        releaseDate: data.releaseDate || data.firstAirDate,
        overview: data.overview,
        year: data.releaseDate ? new Date(data.releaseDate).getFullYear() : 
              data.firstAirDate ? new Date(data.firstAirDate).getFullYear() : null
      };
    } catch (error) {
      console.error(`Error fetching media details for ${type} tmdbId=${tmdbId}:`, error.message);
      return null;
    }
  }

  /**
   * Get pending requests count
   */
  async getPendingCount() {
    if (!this.client) await this.initialize();
    if (!this.client) return 0;

    try {
      const response = await this.client.get('/request/count');
      return response.data.pending || 0;
    } catch (error) {
      console.error('Error fetching Overseerr pending count:', error.message);
      return 0;
    }
  }

  /**
   * Approve a request
   */
  async approveRequest(requestId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Overseerr not configured');

    const response = await this.client.post(`/request/${requestId}/approve`);
    return { success: true, request: this.mapRequest(response.data) };
  }

  /**
   * Decline a request
   */
  async declineRequest(requestId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Overseerr not configured');

    const response = await this.client.post(`/request/${requestId}/decline`);
    return { success: true, request: this.mapRequest(response.data) };
  }

  /**
   * Map Overseerr request to our format
   */
  mapRequest(req, mediaDetails = null) {
    const media = req.media || {};
    const requestedBy = req.requestedBy || {};
    
    // Determine status label
    let statusLabel;
    switch (req.status) {
      case 1: statusLabel = 'pending'; break;
      case 2: statusLabel = 'approved'; break;
      case 3: statusLabel = 'declined'; break;
      case 4: statusLabel = 'available'; break;
      default: statusLabel = 'unknown';
    }

    // Determine media status (this is what Overseerr displays: Available, Partially Available, etc.)
    let mediaStatus;
    let mediaStatusLabel;
    switch (media.status) {
      case 1: mediaStatus = 'unknown'; mediaStatusLabel = 'Unknown'; break;
      case 2: mediaStatus = 'pending'; mediaStatusLabel = 'Pending'; break;
      case 3: mediaStatus = 'processing'; mediaStatusLabel = 'Processing'; break;
      case 4: mediaStatus = 'partially_available'; mediaStatusLabel = 'Partially Available'; break;
      case 5: mediaStatus = 'available'; mediaStatusLabel = 'Available'; break;
      default: mediaStatus = 'unknown'; mediaStatusLabel = 'Requested';
    }

    // Use mediaDetails from separate API call if available, otherwise fallback
    const title = mediaDetails?.title || 
                  media.title || 
                  media.name || 
                  media.originalTitle ||
                  'Unknown Title';

    const posterPath = mediaDetails?.posterPath || 
                       media.posterPath || 
                       null;

    return {
      id: req.id,
      type: req.type === 'movie' ? 'movie' : 'tv',
      status: statusLabel,
      mediaStatus,
      mediaStatusLabel,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      media: {
        id: media.id,
        tmdbId: media.tmdbId,
        tvdbId: media.tvdbId,
        title: title,
        posterPath: posterPath,
        backdropPath: mediaDetails?.backdropPath || media.backdropPath,
        releaseDate: mediaDetails?.releaseDate || media.releaseDate,
        status: mediaStatus,
        statusLabel: mediaStatusLabel
      },
      requestedBy: {
        id: requestedBy.id,
        displayName: requestedBy.displayName || requestedBy.username || 'Unknown',
        avatar: requestedBy.avatar
      },
      seasons: req.seasons?.map(s => ({
        seasonNumber: s.seasonNumber,
        status: s.status
      })) || []
    };
  }

  /**
   * Get stats for home dashboard
   */
  async getStats() {
    if (!this.client) await this.initialize();
    if (!this.client) {
      return { pending: 0, approved: 0, available: 0, configured: false };
    }

    try {
      const response = await this.client.get('/request/count');
      return {
        pending: response.data.pending || 0,
        approved: response.data.approved || 0,
        processing: response.data.processing || 0,
        available: response.data.available || 0,
        configured: true
      };
    } catch (error) {
      console.error('Error getting Overseerr stats:', error.message);
      return { pending: 0, approved: 0, available: 0, configured: true, error: error.message };
    }
  }
}

module.exports = new OverseerrService();
