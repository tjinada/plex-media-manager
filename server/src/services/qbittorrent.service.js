const axios = require('axios');
const QbittorrentConfig = require('../models/QbittorrentConfig');

/**
 * qBittorrent Web API Service
 * Uses REST API with cookie-based authentication
 */
class QbittorrentService {
  constructor() {
    this.client = null;
    this.config = null;
    this.cookie = null;
  }

  /**
   * Initialize the service with config from database
   */
  async initialize() {
    const config = await QbittorrentConfig.getConfig();
    if (config && config.enabled) {
      this.config = config;
      this.client = axios.create({
        baseURL: config.host.replace(/\/$/, ''),
        timeout: 30000,
        withCredentials: true
      });

      // Try to authenticate
      await this.authenticate(config.host, config.username, config.getDecryptedPassword());
    }
    return this;
  }

  /**
   * Authenticate with qBittorrent
   */
  async authenticate(host, username, password) {
    try {
      const response = await axios.post(
        `${host.replace(/\/$/, '')}/api/v2/auth/login`,
        new URLSearchParams({
          username: username || '',
          password: password || ''
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      // qBittorrent returns 'Ok.' on success
      if (response.data === 'Ok.') {
        // Extract SID cookie
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          const sidCookie = cookies.find(c => c.startsWith('SID='));
          if (sidCookie) {
            this.cookie = sidCookie.split(';')[0];
          }
        }
        return true;
      }

      // 'Fails.' on bad credentials
      if (response.data === 'Fails.') {
        throw new Error('Invalid username or password');
      }

      return false;
    } catch (error) {
      if (error.message.includes('Invalid username')) {
        throw error;
      }
      throw new Error(error.message || 'Failed to authenticate with qBittorrent');
    }
  }

  /**
   * Make an authenticated request
   */
  async request(method, endpoint, data = null) {
    if (!this.client || !this.cookie) await this.initialize();
    if (!this.client) throw new Error('qBittorrent not configured');

    const config = {
      headers: {
        Cookie: this.cookie
      }
    };

    if (method === 'GET') {
      const response = await this.client.get(endpoint, config);
      return response.data;
    } else {
      const response = await this.client.post(endpoint, data, config);
      return response.data;
    }
  }

  /**
   * Test connection to qBittorrent
   */
  async testConnection(host, username, password) {
    try {
      // First authenticate
      await this.authenticate(host, username, password);

      // Get version info
      const response = await axios.get(
        `${host.replace(/\/$/, '')}/api/v2/app/version`,
        {
          headers: {
            Cookie: this.cookie
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        version: response.data
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to connect to qBittorrent');
    }
  }

  /**
   * Save qBittorrent configuration
   */
  async saveConfig(host, username, password, externalUrl) {
    const testResult = await this.testConnection(host, username, password);

    const configData = {
      host: host.replace(/\/$/, ''),
      externalUrl: externalUrl ? externalUrl.replace(/\/$/, '') : null,
      username: username || '',
      password: password || '',
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    };

    const config = await QbittorrentConfig.saveConfig(configData);
    await this.initialize();
    return config;
  }

  /**
   * Update qBittorrent configuration
   */
  async updateConfig(updates) {
    const config = await QbittorrentConfig.getConfig();
    if (!config) throw new Error('qBittorrent not configured');

    if (updates.externalUrl !== undefined) {
      config.externalUrl = updates.externalUrl ? updates.externalUrl.replace(/\/$/, '') : null;
    }

    await config.save();
    this.config = config;
    return config;
  }

  /**
   * Get qBittorrent configuration (without password)
   */
  async getConfig() {
    const config = await QbittorrentConfig.getConfig();
    if (!config) return null;

    return {
      host: config.host,
      externalUrl: config.externalUrl || null,
      username: config.username,
      enabled: config.enabled,
      isConnected: config.isConnected,
      version: config.version,
      lastCheckedAt: config.lastCheckedAt
    };
  }

  /**
   * Delete qBittorrent configuration
   */
  async deleteConfig() {
    await QbittorrentConfig.deleteMany({});
    this.client = null;
    this.config = null;
    this.cookie = null;
  }

  /**
   * Get transfer info (global speeds)
   */
  async getTransferInfo() {
    const info = await this.request('GET', '/api/v2/transfer/info');
    return {
      downloadSpeed: info.dl_info_speed,
      uploadSpeed: info.up_info_speed,
      downloadTotal: info.dl_info_data,
      uploadTotal: info.up_info_data,
      connectionStatus: info.connection_status
    };
  }

  /**
   * Get torrent list (queue)
   */
  async getQueue() {
    if (!this.client || !this.cookie) await this.initialize();
    if (!this.client) return { torrents: [], downloadSpeed: 0, uploadSpeed: 0 };

    try {
      const [torrents, transferInfo] = await Promise.all([
        this.request('GET', '/api/v2/torrents/info'),
        this.request('GET', '/api/v2/transfer/info')
      ]);

      const mappedTorrents = torrents.map(torrent => ({
        id: `qbt-${torrent.hash}`,
        hash: torrent.hash,
        name: torrent.name,
        status: this.mapStatus(torrent.state),
        progress: torrent.progress * 100,
        size: torrent.size,
        sizeRemaining: torrent.size - torrent.completed,
        downloadSpeed: torrent.dlspeed,
        uploadSpeed: torrent.upspeed,
        eta: torrent.eta > 0 && torrent.eta < 8640000 ? this.formatEta(torrent.eta) : undefined,
        etaSeconds: torrent.eta > 0 && torrent.eta < 8640000 ? torrent.eta : undefined,
        seeds: torrent.num_seeds,
        peers: torrent.num_leechs,
        ratio: torrent.ratio,
        category: torrent.category,
        added: torrent.added_on ? new Date(torrent.added_on * 1000) : undefined
      }));

      return {
        torrents: mappedTorrents,
        downloadSpeed: transferInfo.dl_info_speed,
        uploadSpeed: transferInfo.up_info_speed
      };
    } catch (error) {
      console.error('Error fetching qBittorrent queue:', error.message);
      // Try to re-authenticate on auth errors
      if (error.response?.status === 403) {
        this.cookie = null;
      }
      return { torrents: [], downloadSpeed: 0, uploadSpeed: 0 };
    }
  }

  /**
   * Map qBittorrent state to our format
   */
  mapStatus(state) {
    const stateLower = (state || '').toLowerCase();

    if (stateLower.includes('downloading') || stateLower === 'dl') return 'downloading';
    if (stateLower.includes('stalled')) return 'stalled';
    if (stateLower.includes('paused')) return 'paused';
    if (stateLower.includes('queued')) return 'queued';
    if (stateLower.includes('checking')) return 'importing';
    if (stateLower.includes('seeding') || stateLower === 'up') return 'seeding';
    if (stateLower.includes('error')) return 'error';
    if (stateLower.includes('moving')) return 'importing';
    if (stateLower.includes('allocating')) return 'queued';
    if (stateLower === 'metadl') return 'queued';
    if (stateLower === 'forcedup') return 'seeding';
    if (stateLower === 'forceddl') return 'downloading';

    return 'queued';
  }

  /**
   * Format ETA seconds to string
   */
  formatEta(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours < 24) return `${hours}h ${minutes}m`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
}

module.exports = new QbittorrentService();
