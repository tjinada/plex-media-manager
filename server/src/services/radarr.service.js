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
      throw new Error(error.response?.data?.message || 'Failed to connect to Radarr');
    }
  }

  async saveConfig(host, apiKey, maxMovieSize) {
    const testResult = await this.testConnection(host, apiKey);
    
    const configData = {
      host: host.replace(/\/$/, ''),
      apiKey: encrypt(apiKey),
      enabled: true,
      isConnected: true,
      version: testResult.version,
      lastCheckedAt: new Date()
    };

    if (maxMovieSize !== undefined) {
      configData.maxMovieSize = maxMovieSize;
    }

    const config = await RadarrConfig.saveConfig(configData);

    await this.initialize();
    return config;
  }

  async updateConfig(updates) {
    const config = await RadarrConfig.getConfig();
    if (!config) throw new Error('Radarr not configured');

    if (updates.maxMovieSize !== undefined) {
      config.maxMovieSize = updates.maxMovieSize;
    }

    await config.save();
    this.config = config;
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
      lastCheckedAt: config.lastCheckedAt,
      maxMovieSize: config.maxMovieSize || 32212254720 // 30GB default
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

  async lookupByTmdbId(tmdbId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const movies = await this.getAllMovies();
    const movie = movies.find(m => m.tmdbId === parseInt(tmdbId));
    
    if (!movie) return null;

    return {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      monitored: movie.monitored,
      hasFile: movie.hasFile
    };
  }

  async lookupByImdbId(imdbId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const movies = await this.getAllMovies();
    const movie = movies.find(m => m.imdbId === imdbId);
    
    if (!movie) return null;

    return {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      monitored: movie.monitored,
      hasFile: movie.hasFile
    };
  }

  getWebUrl() {
    return this.config?.host || null;
  }

  async getMissing(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/wanted/missing', {
      params: {
        page: 1,
        pageSize: 10000,
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

    // Apply pagination manually
    const startIndex = (page - 1) * pageSize;
    const paginatedMovies = movies.slice(startIndex, startIndex + pageSize);

    return {
      movies: paginatedMovies,
      page,
      pageSize,
      total: missingMovies.length
    };
  }

  async getUpcoming(page = 1, pageSize = 50) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    const response = await this.client.get('/wanted/missing', {
      params: {
        page: 1,
        pageSize: 10000,
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

    // Get cutoff unmet movies
    const response = await this.client.get('/wanted/cutoff', {
      params: {
        page: 1,
        pageSize: 10000,
        sortKey: 'title',
        sortDirection: 'ascending',
        monitored: true
      }
    });

    const qualityProfiles = await this.getQualityProfiles();
    const profileMap = new Map(qualityProfiles.map(p => [p.id, { name: p.name, cutoff: p.cutoff, items: p.items }]));

    // Get movie IDs to fetch full details with file info
    const movieIds = response.data.records.map(m => m.id);
    
    // Fetch full movie details to get accurate file sizes
    const allMovies = await this.getAllMovies();
    const movieDetailsMap = new Map(allMovies.map(m => [m.id, m]));

    const movies = response.data.records.map(movie => {
      const profile = profileMap.get(movie.qualityProfileId);
      const fullMovie = movieDetailsMap.get(movie.id);
      const movieFile = fullMovie?.movieFile || movie.movieFile;
      
      const currentQuality = movieFile?.quality?.quality?.name || 'Unknown';
      const cutoffQuality = this.getQualityNameById(profile, profile?.cutoff);
      const fileSize = movieFile?.size || 0;

      return {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        monitored: movie.monitored,
        currentQuality,
        targetQuality: cutoffQuality,
        qualityProfile: profile?.name || 'Unknown',
        fileSize,
        posterUrl: movie.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
      };
    });

    // Apply pagination manually
    const startIndex = (page - 1) * pageSize;
    const paginatedMovies = movies.slice(startIndex, startIndex + pageSize);

    return {
      movies: paginatedMovies,
      page,
      pageSize,
      total: movies.length
    };
  }

  async getDowngrades() {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    // Get config for max size limit
    const config = await RadarrConfig.getConfig();
    const maxMovieSize = config?.maxMovieSize || 32212254720; // 30GB default

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
      const currentSize = movie.movieFile.size || 0;

      const isAboveCutoff = this.isQualityAboveCutoff(profile, currentQualityId, cutoffId);
      const isOversized = currentSize > maxMovieSize;

      // Include if above quality cutoff OR exceeds size limit
      if (isAboveCutoff || isOversized) {
        const currentQuality = movie.movieFile.quality?.quality?.name || 'Unknown';
        const cutoffQuality = this.getQualityNameById(profile, cutoffId);
        
        // Calculate estimated savings
        let estimatedTargetSize;
        if (isOversized) {
          // If oversized, target is max size
          estimatedTargetSize = maxMovieSize;
        } else {
          // If above cutoff, estimate 60% of current size
          estimatedTargetSize = Math.round(currentSize * 0.6);
        }
        const estimatedSavings = currentSize - estimatedTargetSize;

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
          id: movie.id,
          title: movie.title,
          year: movie.year,
          monitored: movie.monitored,
          currentQuality,
          targetQuality: isOversized && !isAboveCutoff ? currentQuality : cutoffQuality,
          qualityProfile: profile.name,
          fileSize: currentSize,
          estimatedSavings: Math.max(0, estimatedSavings),
          posterUrl: movie.images?.find(i => i.coverType === 'poster')?.remoteUrl || null,
          reason
        });
      }
    }

    // Sort by estimated savings descending
    downgrades.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

    return {
      movies: downgrades,
      total: downgrades.length,
      totalEstimatedSavings: downgrades.reduce((sum, m) => sum + m.estimatedSavings, 0)
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

  async getInteractiveSearchResults(movieId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

    // Get releases for the movie - this endpoint performs the search
    // Use longer timeout since indexer searches can take a while
    const response = await this.client.get('/release', {
      params: { movieId: parseInt(movieId) },
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
      customFormatScore: release.customFormatScore || 0
    }));
  }

  async downloadRelease(guid, indexerId) {
    if (!this.client) await this.initialize();
    if (!this.client) throw new Error('Radarr not configured');

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
