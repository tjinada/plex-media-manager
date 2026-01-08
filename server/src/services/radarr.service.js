const axios = require('axios');
const { RadarrConfig } = require('../models');
const { encrypt, decrypt } = require('../config/encryption');

class RadarrService {
  constructor() {
    this.client = null;
    this.config = null;
  }

  async initialize() {
    const config = await RadarrConfig.getConfig();
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
      throw new Error(error.response?.data?.message || 'Failed to connect to Radarr');
    }
  }

  async saveConfig(host, apiKey) {
    const testResult = await this.testConnection(host, apiKey);
    
    const config = await RadarrConfig.saveConfig({
      host: host.replace(/\/$/, ''),
      apiKey: encrypt(apiKey),
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    });

    await this.initialize();
    return config;
  }

  async getConfig() {
    const config = await RadarrConfig.getConfig();
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
    await RadarrConfig.deleteMany({});
    this.client = null;
    this.config = null;
  }

  async getQualityProfiles() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/qualityprofile');
    return response.data;
  }

  async getAllMovies() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/movie');
    return response.data;
  }

  async getMissing(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/wanted/missing', {
      params: {
        page,
        pageSize,
        sortKey: 'title',
        sortDirection: 'ascending',
        monitored: true
      }
    });

    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, p.name]));

    // Filter to only include movies that are available (released)
    const missingMovies = response.data.records.filter(movie => movie.isAvailable);

    const movies = missingMovies.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      monitored: movie.monitored,
      qualityProfile: profileMap.get(movie.qualityProfileId) || 'Unknown',
      posterUrl: movie.images?.find(i => i.coverType === 'poster')?.remoteUrl || null,
      added: movie.added,
      digitalRelease: movie.digitalRelease,
      physicalRelease: movie.physicalRelease,
      inCinemas: movie.inCinemas
    }));

    // Recalculate total for missing only (available movies)
    const allMissingResponse = await this.client.get('/wanted/missing', {
      params: { page: 1, pageSize: 1, monitored: true }
    });
    
    // Count available vs upcoming from all records
    const fullResponse = await this.client.get('/wanted/missing', {
      params: { page: 1, pageSize: allMissingResponse.data.totalRecords, monitored: true }
    });
    const totalMissing = fullResponse.data.records.filter(m => m.isAvailable).length;

    return {
      movies,
      page,
      pageSize,
      total: totalMissing
    };
  }

  async getUpcoming(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/wanted/missing', {
      params: {
        page: 1,
        pageSize: 10000, // Get all to filter
        sortKey: 'digitalRelease',
        sortDirection: 'ascending',
        monitored: true
      }
    });

    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, p.name]));

    // Filter to only include movies that are NOT available (not released)
    const upcomingMovies = response.data.records.filter(movie => !movie.isAvailable);

    const movies = upcomingMovies.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      monitored: movie.monitored,
      qualityProfile: profileMap.get(movie.qualityProfileId) || 'Unknown',
      posterUrl: movie.images?.find(i => i.coverType === 'poster')?.remoteUrl || null,
      added: movie.added,
      digitalRelease: movie.digitalRelease,
      physicalRelease: movie.physicalRelease,
      inCinemas: movie.inCinemas,
      status: movie.status
    }));

    // Apply pagination manually
    const startIndex = (page - 1) * pageSize;
    const paginatedMovies = movies.slice(startIndex, startIndex + pageSize);

    return {
      movies: paginatedMovies,
      page,
      pageSize,
      total: upcomingMovies.length
    };
  }

  async getUpgrades(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/wanted/cutoff', {
      params: {
        page,
        pageSize,
        sortKey: 'title',
        sortDirection: 'ascending',
        monitored: true
      }
    });

    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, { name: p.name, cutoff: p.cutoff, items: p.items }]));

    const movies = response.data.records.map(movie => {
      const profile = profileMap.get(movie.qualityProfileId);
      const currentQuality = movie.movieFile?.quality?.quality?.name || 'Unknown';
      const cutoffQuality = this.getQualityNameById(profile, profile?.cutoff);

      return {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        monitored: movie.monitored,
        currentQuality,
        targetQuality: cutoffQuality,
        qualityProfile: profile?.name || 'Unknown',
        fileSize: movie.movieFile?.size || 0,
        posterUrl: movie.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
      };
    });

    return {
      movies,
      page: response.data.page,
      pageSize: response.data.pageSize,
      total: response.data.totalRecords
    };
  }

  async getDowngrades() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const allMovies = await this.getAllMovies();
    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, { name: p.name, cutoff: p.cutoff, items: p.items }]));

    const downgrades = [];

    for (const movie of allMovies) {
      if (!movie.hasFile || !movie.movieFile) continue;

      const profile = profileMap.get(movie.qualityProfileId);
      if (!profile) continue;

      const currentQualityId = movie.movieFile.quality?.quality?.id;
      const cutoffId = profile.cutoff;

      if (this.isQualityAboveCutoff(profile, currentQualityId, cutoffId)) {
        const currentQuality = movie.movieFile.quality?.quality?.name || 'Unknown';
        const cutoffQuality = this.getQualityNameById(profile, cutoffId);
        const currentSize = movie.movieFile.size || 0;
        
        const estimatedTargetSize = Math.round(currentSize * 0.6);
        const estimatedSavings = currentSize - estimatedTargetSize;

        downgrades.push({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          monitored: movie.monitored,
          currentQuality,
          targetQuality: cutoffQuality,
          qualityProfile: profile.name,
          fileSize: currentSize,
          estimatedSavings,
          posterUrl: movie.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
        });
      }
    }

    return {
      movies: downgrades,
      total: downgrades.length
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

  async triggerSearch(movieId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.post('/command', {
      name: 'MoviesSearch',
      movieIds: [parseInt(movieId)]
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
      return { missing: 0, upcoming: 0, upgrades: 0, downgrades: 0, configured: false };
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
        configured: true
      };
    } catch (error) {
      console.error('Error getting Radarr stats:', error.message);
      return { missing: 0, upcoming: 0, upgrades: 0, downgrades: 0, configured: true, error: error.message };
    }
  }
}

module.exports = new RadarrService();
