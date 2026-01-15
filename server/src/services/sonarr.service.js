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
        timeout: 30000
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

  async saveConfig(host, apiKey, maxEpisodeSize) {
    const testResult = await this.testConnection(host, apiKey);
    
    const configData = {
      host: host.replace(/\/$/, ''),
      apiKey: encrypt(apiKey),
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    };

    if (maxEpisodeSize !== undefined) {
      configData.maxEpisodeSize = maxEpisodeSize;
    }

    const config = await SonarrConfig.saveConfig(configData);

    await this.initialize();
    return config;
  }

  async updateConfig(updates) {
    const config = await SonarrConfig.getConfig();
    if (!config) throw new Error('Sonarr not configured');

    if (updates.maxEpisodeSize !== undefined) {
      config.maxEpisodeSize = updates.maxEpisodeSize;
    }

    await config.save();
    this.config = config;
    return config;
  }

  async getConfig() {
    const config = await SonarrConfig.getConfig();
    if (!config) return null;
    
    return {
      host: config.host,
      enabled: config.enabled,
      isConnected: config.isConnected,
      version: config.version,
      lastCheckedAt: config.lastCheckedAt,
      maxEpisodeSize: config.maxEpisodeSize || 5368709120 // 5GB default
    };
  }

  async deleteConfig() {
    await SonarrConfig.deleteMany({});
    this.client = null;
    this.config = null;
  }

  async getQueue() {
    if (!this.client) await this.initialize();
    if (!this.client) return { records: [] };

    try {
      const response = await this.client.get('/queue', {
        params: {
          page: 1,
          pageSize: 100,
          includeSeries: true,
          includeEpisode: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Sonarr queue:', error.message);
      return { records: [] };
    }
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

  async lookupByTvdbId(tvdbId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const allSeries = await this.getAllSeries();
    const series = allSeries.find(s => s.tvdbId === parseInt(tvdbId));
    
    if (!series) return null;

    return {
      id: series.id,
      title: series.title,
      year: series.year,
      tvdbId: series.tvdbId,
      imdbId: series.imdbId,
      monitored: series.monitored
    };
  }

  async lookupEpisode(seriesId, seasonNumber, episodeNumber) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const episodes = await this.getEpisodes(seriesId);
    const episode = episodes.find(e => 
      e.seasonNumber === parseInt(seasonNumber) && 
      e.episodeNumber === parseInt(episodeNumber)
    );
    
    if (!episode) return null;

    return {
      id: episode.id,
      seriesId: episode.seriesId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      hasFile: episode.hasFile,
      monitored: episode.monitored
    };
  }

  getWebUrl() {
    return this.config?.host || null;
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

  isEpisodeAired(episode) {
    if (!episode.airDateUtc) return false;
    const airDate = new Date(episode.airDateUtc);
    const now = new Date();
    return airDate <= now;
  }

  async getMissing(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    // Get all missing episodes to filter
    const response = await this.client.get('/wanted/missing', {
      params: {
        page: 1,
        pageSize: 10000,
        sortKey: 'airDateUtc',
        sortDirection: 'descending',
        includeSeries: true,
        monitored: true
      }
    });

    // Filter to only include episodes that have already aired
    const airedEpisodes = response.data.records.filter(episode => this.isEpisodeAired(episode));

    const episodes = airedEpisodes.map(episode => ({
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

    // Apply pagination manually
    const startIndex = (page - 1) * pageSize;
    const paginatedEpisodes = episodes.slice(startIndex, startIndex + pageSize);

    return {
      episodes: paginatedEpisodes,
      page,
      pageSize,
      total: airedEpisodes.length
    };
  }

  async getUpcoming(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    // Get all missing episodes to filter
    const response = await this.client.get('/wanted/missing', {
      params: {
        page: 1,
        pageSize: 10000,
        sortKey: 'airDateUtc',
        sortDirection: 'ascending',
        includeSeries: true,
        monitored: true
      }
    });

    // Filter to only include episodes that have NOT aired yet
    const upcomingEpisodes = response.data.records.filter(episode => !this.isEpisodeAired(episode));

    const episodes = upcomingEpisodes.map(episode => ({
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

    // Apply pagination manually
    const startIndex = (page - 1) * pageSize;
    const paginatedEpisodes = episodes.slice(startIndex, startIndex + pageSize);

    return {
      episodes: paginatedEpisodes,
      page,
      pageSize,
      total: upcomingEpisodes.length
    };
  }

  async getUpgrades(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    // Get all cutoff unmet episodes
    const response = await this.client.get('/wanted/cutoff', {
      params: {
        page: 1,
        pageSize: 10000,
        sortKey: 'airDateUtc',
        sortDirection: 'descending',
        includeSeries: true,
        monitored: true
      }
    });

    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, { name: p.name, cutoff: p.cutoff, items: p.items }]));

    // Build a map of series to their episode files for accurate size data
    const seriesIds = [...new Set(response.data.records.map(e => e.seriesId))];
    const episodeFileMap = new Map();

    for (const seriesId of seriesIds) {
      try {
        const files = await this.getEpisodeFiles(seriesId);
        for (const file of files) {
          episodeFileMap.set(file.id, file);
        }
      } catch (error) {
        console.error(`Error fetching files for series ${seriesId}:`, error.message);
      }
    }

    const episodes = response.data.records.map(episode => {
      const profile = profileMap.get(episode.series?.qualityProfileId);
      const episodeFile = episodeFileMap.get(episode.episodeFileId) || episode.episodeFile;
      const currentQuality = episodeFile?.quality?.quality?.name || 'Unknown';
      const cutoffQuality = this.getQualityNameById(profile, profile?.cutoff);
      const fileSize = episodeFile?.size || 0;

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
        fileSize,
        posterUrl: episode.series?.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
      };
    });

    // Apply pagination manually
    const startIndex = (page - 1) * pageSize;
    const paginatedEpisodes = episodes.slice(startIndex, startIndex + pageSize);

    return {
      episodes: paginatedEpisodes,
      page,
      pageSize,
      total: episodes.length
    };
  }

  async getDowngrades() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    // Get config for max size limit
    const config = await SonarrConfig.getConfig();
    const maxEpisodeSize = config?.maxEpisodeSize || 5368709120; // 5GB default

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
          const currentSize = file.size || 0;

          const isAboveCutoff = this.isQualityAboveCutoff(profile, currentQualityId, cutoffId);
          const isOversized = currentSize > maxEpisodeSize;

          // Include if above quality cutoff OR exceeds size limit
          if (isAboveCutoff || isOversized) {
            const currentQuality = file.quality?.quality?.name || 'Unknown';
            const cutoffQuality = this.getQualityNameById(profile, cutoffId);
            
            // Calculate estimated savings
            let estimatedTargetSize;
            if (isOversized) {
              // If oversized, target is max size
              estimatedTargetSize = maxEpisodeSize;
            } else {
              // If above cutoff, estimate 60% of current size
              estimatedTargetSize = Math.round(currentSize * 0.6);
            }
            const estimatedSavings = currentSize - estimatedTargetSize;
            totalEstimatedSavings += Math.max(0, estimatedSavings);

            // Determine reason
            let reason;
            if (isAboveCutoff && isOversized) {
              reason = 'both';
            } else if (isAboveCutoff) {
              reason = 'quality';
            } else {
              reason = 'size';
            }

            downgrades.push({
              id: episode.id,
              seriesId: series.id,
              seriesTitle: series.title,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              title: episode.title,
              monitored: episode.monitored,
              currentQuality,
              targetQuality: isOversized && !isAboveCutoff ? currentQuality : cutoffQuality,
              fileSize: currentSize,
              estimatedSavings: Math.max(0, estimatedSavings),
              posterUrl: series.images?.find(i => i.coverType === 'poster')?.remoteUrl || null,
              reason
            });
          }
        }
      } catch (error) {
        console.error(`Error processing series ${series.title}:`, error.message);
      }
    }

    // Sort by estimated savings descending
    downgrades.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

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

  async getInteractiveSearchResults(episodeId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    // Get releases for the episode - this endpoint performs the search
    // Use longer timeout since indexer searches can take a while
    const response = await this.client.get('/release', {
      params: { episodeId: parseInt(episodeId) },
      timeout: 120000 // 2 minutes for indexer searches
    });

    return response.data.map(release => ({
      guid: release.guid,
      title: release.title,
      indexer: release.indexer,
      indexerId: release.indexerId,
      size: release.size,
      age: release.age,
      ageHours: release.ageHours,
      quality: release.quality?.quality?.name || 'Unknown',
      qualityWeight: release.qualityWeight || 0,
      seeders: release.seeders || 0,
      leechers: release.leechers || 0,
      protocol: release.protocol,
      approved: !release.rejected,
      rejected: release.rejected || false,
      rejections: release.rejections || [],
      downloadUrl: release.downloadUrl,
      infoUrl: release.infoUrl,
      languages: release.languages?.map(l => l.name) || ['Unknown'],
      customFormatScore: release.customFormatScore || 0,
      seasonNumber: release.seasonNumber,
      episodeNumbers: release.episodeNumbers || [],
      fullSeason: release.fullSeason || false
    }));
  }

  async downloadRelease(guid, indexerId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Sonarr not configured');

    const response = await this.client.post('/release', {
      guid,
      indexerId
    });

    return {
      success: true,
      approved: response.data.approved,
      rejected: response.data.rejected,
      rejections: response.data.rejections || []
    };
  }

  async getStats() {
    if (!this.client) await this.initialize();
    if (!this.client) {
      return { missing: 0, upcoming: 0, upgrades: 0, downgrades: 0, totalEstimatedSavings: 0, configured: false };
    }

    try {
      const [missing, upcoming, upgrades, downgrades] = await Promise.all([
        this.getMissing(1, 1),
        this.getUpcoming(1, 1),
        this.getUpgrades(1, 1),
        this.getDowngrades()
      ]);

      return {
        missing: missing.total,
        upcoming: upcoming.total,
        upgrades: upgrades.total,
        downgrades: downgrades.total,
        totalEstimatedSavings: downgrades.totalEstimatedSavings,
        configured: true
      };
    } catch (error) {
      console.error('Error getting Sonarr stats:', error.message);
      return { missing: 0, upcoming: 0, upgrades: 0, downgrades: 0, totalEstimatedSavings: 0, configured: true, error: error.message };
    }
  }

  /**
   * Get download history
   */
  async getHistory(pageSize = 20) {
    if (!this.client) await this.initialize();
    if (!this.client) return { records: [] };

    try {
      const response = await this.client.get('/history', {
        params: {
          page: 1,
          pageSize,
          sortKey: 'date',
          sortDirection: 'descending',
          includeSeries: true,
          includeEpisode: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Sonarr history:', error.message);
      return { records: [] };
    }
  }
}

module.exports = new SonarrService();
