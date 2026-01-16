const axios = require('axios');
const NzbgetConfig = require('../models/NzbgetConfig');

/**
 * NZBGet API Service
 * Uses JSON-RPC over HTTP
 */
class NzbgetService {
  constructor() {
    this.client = null;
    this.config = null;
  }

  /**
   * Initialize the service with config from database
   */
  async initialize() {
    const config = await NzbgetConfig.getConfig();
    if (config && config.enabled) {
      this.config = config;

      // Build URL with auth if provided
      const url = new URL(config.host);
      if (config.username) {
        url.username = config.username;
        url.password = config.getDecryptedPassword() || '';
      }

      this.client = axios.create({
        baseURL: url.toString().replace(/\/$/, '') + '/jsonrpc',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    }
    return this;
  }

  /**
   * Make a JSON-RPC request to NZBGet
   */
  async request(method, params = []) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('NZBGet not configured');

    const response = await this.client.post('', {
      method,
      params,
      id: Date.now()
    });

    if (response.data.error) {
      throw new Error(response.data.error.message || 'NZBGet API error');
    }

    return response.data.result;
  }

  /**
   * Test connection to NZBGet
   */
  async testConnection(host, username, password) {
    try {
      const url = new URL(host);
      if (username) {
        url.username = username;
        url.password = password || '';
      }

      const response = await axios.post(
        url.toString().replace(/\/$/, '') + '/jsonrpc',
        {
          method: 'version',
          params: [],
          id: 1
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error.message || 'NZBGet API error');
      }

      return {
        success: true,
        version: response.data.result
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw new Error(error.message || 'Failed to connect to NZBGet');
    }
  }

  /**
   * Save NZBGet configuration
   */
  async saveConfig(host, username, password) {
    const testResult = await this.testConnection(host, username, password);

    const configData = {
      host: host.replace(/\/$/, ''),
      username: username || '',
      password: password || '',
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    };

    const config = await NzbgetConfig.saveConfig(configData);
    await this.initialize();
    return config;
  }

  /**
   * Get NZBGet configuration (without password)
   */
  async getConfig() {
    const config = await NzbgetConfig.getConfig();
    if (!config) return null;

    return {
      host: config.host,
      username: config.username,
      enabled: config.enabled,
      isConnected: config.isConnected,
      version: config.version,
      lastCheckedAt: config.lastCheckedAt
    };
  }

  /**
   * Delete NZBGet configuration
   */
  async deleteConfig() {
    await NzbgetConfig.deleteMany({});
    this.client = null;
    this.config = null;
  }

  /**
   * Get NZBGet status
   */
  async getStatus() {
    const result = await this.request('status');
    return {
      downloadRate: result.DownloadRate,
      remainingSize: result.RemainingSizeMB * 1024 * 1024,
      downloadPaused: result.DownloadPaused,
      postPaused: result.PostPaused,
      serverTime: result.ServerTime,
      uptime: result.UpTimeSec
    };
  }

  /**
   * Get download queue (list groups)
   */
  async getQueue() {
    if (!this.client) await this.initialize();
    if (!this.client) return { downloads: [], speed: 0, sizeRemaining: 0, downloadPaused: false };

    try {
      const [groups, status] = await Promise.all([
        this.request('listgroups'),
        this.request('status')
      ]);

      const downloads = groups.map(group => ({
        id: `nzbget-${group.NZBID}`,
        nzbId: group.NZBID,
        name: group.NZBName,
        status: this.mapStatus(group.Status),
        progress: group.FileSizeMB > 0
          ? ((group.FileSizeMB - group.RemainingSizeMB) / group.FileSizeMB) * 100
          : 0,
        size: group.FileSizeMB * 1024 * 1024,
        sizeRemaining: group.RemainingSizeMB * 1024 * 1024,
        speed: group.DownloadRate || 0,
        category: group.Category,
        eta: this.calculateEta(group.RemainingSizeMB * 1024 * 1024, status.DownloadRate)
      }));

      return {
        downloads,
        speed: status.DownloadRate,
        sizeRemaining: status.RemainingSizeMB * 1024 * 1024,
        downloadPaused: status.DownloadPaused
      };
    } catch (error) {
      console.error('Error fetching NZBGet queue:', error.message);
      return { downloads: [], speed: 0, sizeRemaining: 0, downloadPaused: false };
    }
  }

  /**
   * Get download history
   * @param limit - Number of items to return
   * @param includeHidden - Include hidden history items (default: true)
   */
  async getHistory(limit = 20, includeHidden = true) {
    if (!this.client) await this.initialize();
    if (!this.client) return [];

    try {
      // NZBGet history API: history(Hidden) where Hidden=true includes hidden items
      const history = await this.request('history', [includeHidden]);

      return history.slice(0, limit).map(item => ({
        id: `nzbget-${item.NZBID}`,
        nzbId: item.NZBID,
        name: item.Name,  // History uses 'Name', not 'NZBName'
        status: item.Status,
        category: item.Category,
        size: item.FileSizeMB * 1024 * 1024,
        downloadTime: item.DownloadTimeSec,
        postTime: item.PostTotalTimeSec,
        completedAt: item.HistoryTime ? new Date(item.HistoryTime * 1000) : null,
        hidden: item.Hidden || false
      }));
    } catch (error) {
      console.error('Error fetching NZBGet history:', error.message);
      return [];
    }
  }

  /**
   * Map NZBGet status to our format
   */
  mapStatus(status) {
    const statusLower = (status || '').toLowerCase();

    if (statusLower.includes('downloading')) return 'downloading';
    if (statusLower.includes('queued')) return 'queued';
    if (statusLower.includes('paused')) return 'paused';
    if (statusLower.includes('postprocess') || statusLower.includes('unpacking')) return 'extracting';
    if (statusLower.includes('fetching')) return 'queued';

    return 'queued';
  }

  /**
   * Calculate ETA string
   */
  calculateEta(remainingBytes, speedBps) {
    if (!speedBps || speedBps <= 0 || !remainingBytes) return undefined;

    const seconds = Math.ceil(remainingBytes / speedBps);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

module.exports = new NzbgetService();
