const axios = require('axios');
const { SonarrConfig } = require('../models');
const { encrypt, decrypt } = require('../config/encryption');

class SonarrService {
  constructor() {
    this.client = null;
    this.config = null;
  }

  async initialize() {
    const config = await SonarrConfig.getConfig();
    if (config && config.enabled) {
      this.config = config;
      this.client = axios.create({
        baseURL: `${config.host}/api/v3`,
        headers: {
          'X-Api-Key': decrypt(config.apiKey),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    }
    return this;
  }

  async testConnection(host, apiKey) {
    try {
      const response = await axios.get(`${host}/api/v3/system/status`, {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return {
        success: true,
        version: response.data.version,
        appName: response.data.appName
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to connect to Sonarr');
    }
  }

  async saveConfig(host, apiKey) {
    // Test connection first
    const testResult = await this.testConnection(host, apiKey);
    
    // Save config with encrypted API key
    const config = await SonarrConfig.saveConfig({
      host: host.replace(/\/$/, ''), // Remove trailing slash
      apiKey: encrypt(apiKey),
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    });

    // Re-initialize client
    await this.initialize();

    return config;
  }

  async getConfig() {
    const config = await SonarrConfig.getConfig();
    if (!config) return null;
    
    // Don't expose the API key
    return {
      host: config.host,
      enabled: config.enabled,
      isConnected: config.isConnected,
      version: config.version,
      lastCheckedAt: config.lastCheckedAt
    };
  }

  async deleteConfig() {
    await SonarrConfig.deleteMany({});
    this.client = null;
    this.config = null;
  }

  async getQualityProfiles() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.get('/qualityprofile');
    return response.data;
  }

  async getAllSeries() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.get('/series');
    return response.data;
  }

  async getEpisodes(seriesId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.get('/episode', {
      params: { seriesId }
    });
    return response.data;
  }

  async getEpisodeFiles(seriesId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.get('/episodefile', {
      params: { seriesId }
    });
    return response.data;
  }

  async getMissing(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.get('/wanted/missing', {
      params: {
        page,
        pageSize,
        sortKey: 'airDateUtc',
        sortDirection: 'descending',
        includeSeries: true,
        monitored: true
      }
    });

    const episodes = response.data.records.map(episode => ({
      id: episode.id,
      seriesId: episode.seriesId,
      seriesTitle: episode.series?.title || 'Unknown',
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      airDate: episode.airDateUtc,
      monitored: episode.monitored,
      posterUrl: episode.series?.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
    }));

    return {
      episodes,
      page: response.data.page,
      pageSize: response.data.pageSize,
      total: response.data.totalRecords
    };
  }

  async getUpgrades(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.get('/wanted/cutoff', {
      params: {
        page,
        pageSize,
        sortKey: 'airDateUtc',
        sortDirection: 'descending',
        includeSeries: true,
        monitored: true
      }
    });

    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, { name: p.name, cutoff: p.cutoff, items: p.items }]));

    const episodes = response.data.records.map(episode => {
      const profile = profileMap.get(episode.series?.qualityProfileId);
      const currentQuality = episode.episodeFile?.quality?.quality?.name || 'Unknown';
      const cutoffQuality = this.getQualityNameById(profile, profile?.cutoff);

      return {
        id: episode.id,
        seriesId: episode.seriesId,
        seriesTitle: episode.series?.title || 'Unknown',
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        monitored: episode.monitored,
        currentQuality,
        targetQuality: cutoffQuality,
        fileSize: episode.episodeFile?.size || 0,
        posterUrl: episode.series?.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
      };
    });

    return {
      episodes,
      page: response.data.page,
      pageSize: response.data.pageSize,
      total: response.data.totalRecords
    };
  }

  async getDowngrades() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const allSeries = await this.getAllSeries();
    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, { name: p.name, cutoff: p.cutoff, items: p.items }]));

    const downgrades = [];
    let totalEstimatedSavings = 0;

    for (const series of allSeries) {
      const profile = profileMap.get(series.qualityProfileId);
      if (!profile) continue;

      try {
        const episodeFiles = await this.getEpisodeFiles(series.id);
        const episodes = await this.getEpisodes(series.id);
        
        const episodeMap = new Map(episodes.map(e => [e.episodeFileId, e]));

        for (const file of episodeFiles) {
          const episode = episodeMap.get(file.id);
          if (!episode) continue;

          const currentQualityId = file.quality?.quality?.id;
          const cutoffId = profile.cutoff;

          if (this.isQualityAboveCutoff(profile, currentQualityId, cutoffId)) {
            const currentQuality = file.quality?.quality?.name || 'Unknown';
            const cutoffQuality = this.getQualityNameById(profile, cutoffId);
            const currentSize = file.size || 0;
            
            // Estimate savings
            const estimatedTargetSize = Math.round(currentSize * 0.6);
            const estimatedSavings = currentSize - estimatedTargetSize;
            totalEstimatedSavings += estimatedSavings;

            downgrades.push({
              id: episode.id,
              seriesId: series.id,
              seriesTitle: series.title,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              title: episode.title,
              monitored: episode.monitored,
              currentQuality,
              targetQuality: cutoffQuality,
              fileSize: currentSize,
              estimatedSavings,
              posterUrl: series.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
            });
          }
        }
      } catch (error) {
        console.error(`Error processing series ${series.title}:`, error.message);
      }
    }

    return {
      episodes: downgrades,
      total: downgrades.length,
      totalEstimatedSavings
    };
  }

  getQualityNameById(profile, qualityId) {
    if (!profile || !profile.items) return 'Unknown';
    
    for (const item of profile.items) {
      if (item.quality && item.quality.id === qualityId) {
        return item.quality.name;
      }
      if (item.items) {
        for (const subItem of item.items) {
          if (subItem.quality && subItem.quality.id === qualityId) {
            return subItem.quality.name;
          }
        }
      }
    }
    return 'Unknown';
  }

  isQualityAboveCutoff(profile, currentQualityId, cutoffId) {
    if (!profile || !profile.items) return false;

    const qualityOrder = [];
    for (const item of profile.items) {
      if (item.allowed) {
        if (item.quality) {
          qualityOrder.push(item.quality.id);
        }
        if (item.items) {
          for (const subItem of item.items) {
            if (subItem.quality) {
              qualityOrder.push(subItem.quality.id);
            }
          }
        }
      }
    }

    const currentIndex = qualityOrder.indexOf(currentQualityId);
    const cutoffIndex = qualityOrder.indexOf(cutoffId);

    return currentIndex > cutoffIndex && cutoffIndex !== -1;
  }

  async triggerSearch(episodeId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.post('/command', {
      name: 'EpisodeSearch',
      episodeIds: [parseInt(episodeId)]
    });

    return {
      success: true,
      commandId: response.data.id,
      status: response.data.status
    };
  }

  async getStats() {
    if (!this.client) await this.initialize();
    if (!this.client) {
      return { missing: 0, upgrades: 0, downgrades: 0, totalEstimatedSavings: 0, configured: false };
    }

    try {
      const [missing, upgrades, downgrades] = await Promise.all([
        this.getMissing(1, 1),
        this.getUpgrades(1, 1),
        this.getDowngrades()
      ]);

      return {
        missing: missing.total,
        upgrades: upgrades.total,
        downgrades: downgrades.total,
        totalEstimatedSavings: downgrades.totalEstimatedSavings,
        configured: true
      };
    } catch (error) {
      console.error('Error getting Sonarr stats:', error.message);
      return { missing: 0, upgrades: 0, downgrades: 0, totalEstimatedSavings: 0, configured: true, error: error.message };
    }
  }
}

module.exports = new SonarrService();
