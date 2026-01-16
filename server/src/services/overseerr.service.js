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

  async saveConfig(host, apiKey) {
    const testResult = await this.testConnection(host, apiKey);
    
    const configData = {
      host: host.replace(/\/$/, ''),
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

  async getConfig() {
    const config = await OverseerrConfig.getConfig();
    if (!config) return null;
    
    return {
      host: config.host,
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
      
      return {
        results: response.data.results.map(req => this.mapRequest(req)),
        pageInfo: response.data.pageInfo
      };
    } catch (error) {
      console.error('Error fetching Overseerr requests:', error.message);
      return { results: [], pageInfo: { pages: 0, results: 0 } };
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
  mapRequest(req) {
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

    // Determine media status
    let mediaStatus;
    switch (media.status) {
      case 1: mediaStatus = 'unknown'; break;
      case 2: mediaStatus = 'pending'; break;
      case 3: mediaStatus = 'processing'; break;
      case 4: mediaStatus = 'partially_available'; break;
      case 5: mediaStatus = 'available'; break;
      default: mediaStatus = 'unknown';
    }

    return {
      id: req.id,
      type: req.type === 'movie' ? 'movie' : 'tv',
      status: statusLabel,
      mediaStatus,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      media: {
        id: media.id,
        tmdbId: media.tmdbId,
        tvdbId: media.tvdbId,
        title: media.title || req.media?.title,
        posterPath: media.posterPath,
        backdropPath: media.backdropPath,
        releaseDate: media.releaseDate,
        status: mediaStatus
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
