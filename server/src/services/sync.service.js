const { PlexServer, Movie, TVShow, Season, Episode, SyncJob } = require('../models');
const PlexService = require('./plex.service');
const { getResolution } = require('../utils/resolution');
const { normalizeVideoCodec, normalizeAudioCodec, normalizeContainer } = require('../utils/codec');

// Track current sync job
let currentSyncJob = null;

class SyncService {
  constructor() {
    this.plexService = null;
    this.server = null;
    this.job = null;
  }

  /**
   * Check if a sync is currently running
   */
  static isRunning() {
    return currentSyncJob !== null;
  }

  /**
   * Get current sync status
   */
  static async getStatus() {
    if (currentSyncJob) {
      const job = await SyncJob.findById(currentSyncJob);
      return {
        isRunning: true,
        currentJob: job
      };
    }
    
    return {
      isRunning: false,
      currentJob: null
    };
  }

  /**
   * Get sync history
   */
  static async getHistory(limit = 10) {
    return SyncJob.find()
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Start a sync job
   */
  async startSync(type = 'full') {
    if (SyncService.isRunning()) {
      throw new Error('A sync is already in progress');
    }

    // Get server configuration
    this.server = await PlexServer.getServer();
    if (!this.server) {
      throw new Error('No Plex server configured');
    }

    // Initialize Plex service
    this.plexService = new PlexService(this.server.host, this.server.token);

    // Test connection
    try {
      await this.plexService.testConnection();
    } catch (error) {
      throw new Error(`Cannot connect to Plex server: ${error.message}`);
    }

    // Create sync job
    this.job = await SyncJob.create({
      serverId: this.server._id,
      type,
      status: 'running',
      startedAt: new Date()
    });

    currentSyncJob = this.job._id;

    // Run sync in background
    this.runSync(type).catch(async (error) => {
      console.error('Sync failed:', error);
      await this.failJob(error.message);
    });

    return this.job;
  }

  /**
   * Run the actual sync process
   */
  async runSync(type) {
    try {
      if (type === 'full' || type === 'movies') {
        await this.syncMovies();
      }

      if (type === 'full' || type === 'shows') {
        await this.syncShows();
      }

      // Complete the job
      await this.completeJob();

      // Update server last sync time
      await PlexServer.updateOne(
        { _id: this.server._id },
        { lastSyncAt: new Date(), isConnected: true }
      );

    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync movies from Plex
   */
  async syncMovies() {
    console.log('Starting movie sync...');
    
    const plexMovies = await this.plexService.getAllMovies();
    
    await this.updateJob({ totalItems: (this.job.totalItems || 0) + plexMovies.length });

    for (const plexMovie of plexMovies) {
      try {
        // Get detailed metadata
        const details = await this.plexService.getMetadata(plexMovie.ratingKey);
        
        const mediaInfo = this.plexService.parseMediaInfo(details);
        const guids = this.plexService.parseGuids(details);

        // Build movie document
        const movieData = {
          plexId: plexMovie.ratingKey,
          serverId: this.server._id,
          
          title: plexMovie.title,
          originalTitle: plexMovie.originalTitle,
          year: plexMovie.year,
          summary: plexMovie.summary,
          tagline: plexMovie.tagline,
          contentRating: plexMovie.contentRating,
          rating: plexMovie.rating,
          audienceRating: plexMovie.audienceRating,
          studio: plexMovie.studio,
          
          guid: plexMovie.guid,
          imdbId: guids.imdbId,
          tmdbId: guids.tmdbId,
          
          posterUrl: plexMovie.thumb,
          artUrl: plexMovie.art,
          thumbUrl: plexMovie.thumb,
          
          genres: (plexMovie.Genre || []).map(g => g.tag),
          directors: (plexMovie.Director || []).map(d => d.tag),
          writers: (plexMovie.Writer || []).map(w => w.tag),
          actors: (plexMovie.Role || []).slice(0, 10).map(r => ({
            name: r.tag,
            role: r.role,
            thumb: r.thumb
          })),
          
          media: mediaInfo ? {
            ...mediaInfo,
            resolution: getResolution(mediaInfo.width, mediaInfo.height),
            videoCodec: normalizeVideoCodec(mediaInfo.videoCodec),
            audioCodec: normalizeAudioCodec(mediaInfo.audioCodec),
            container: normalizeContainer(mediaInfo.container)
          } : null,
          
          libraryId: plexMovie.libraryId,
          libraryName: plexMovie.libraryName,
          
          addedAt: plexMovie.addedAt ? new Date(plexMovie.addedAt * 1000) : null,
          updatedAt: plexMovie.updatedAt ? new Date(plexMovie.updatedAt * 1000) : null,
          lastSyncedAt: new Date()
        };

        // Upsert movie
        const result = await Movie.updateOne(
          { plexId: plexMovie.ratingKey, serverId: this.server._id },
          { $set: movieData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          this.job.moviesAdded++;
        } else if (result.modifiedCount > 0) {
          this.job.moviesUpdated++;
        }

        this.job.processedItems++;
        
        // Save progress periodically
        if (this.job.processedItems % 10 === 0) {
          await this.updateJob({
            processedItems: this.job.processedItems,
            moviesAdded: this.job.moviesAdded,
            moviesUpdated: this.job.moviesUpdated
          });
        }

      } catch (error) {
        console.error(`Error syncing movie ${plexMovie.title}:`, error.message);
      }
    }

    // Final update
    await this.updateJob({
      processedItems: this.job.processedItems,
      moviesAdded: this.job.moviesAdded,
      moviesUpdated: this.job.moviesUpdated
    });

    console.log(`Movie sync complete: ${this.job.moviesAdded} added, ${this.job.moviesUpdated} updated`);
  }

  /**
   * Sync TV shows from Plex
   */
  async syncShows() {
    console.log('Starting TV show sync...');
    
    const plexShows = await this.plexService.getAllShows();
    
    await this.updateJob({ totalItems: (this.job.totalItems || 0) + plexShows.length });

    for (const plexShow of plexShows) {
      try {
        // Get detailed show metadata
        const details = await this.plexService.getMetadata(plexShow.ratingKey);
        const guids = this.plexService.parseGuids(details);

        // Build show document
        const showData = {
          plexId: plexShow.ratingKey,
          serverId: this.server._id,
          
          title: plexShow.title,
          originalTitle: plexShow.originalTitle,
          year: plexShow.year,
          summary: plexShow.summary,
          tagline: plexShow.tagline,
          contentRating: plexShow.contentRating,
          rating: plexShow.rating,
          studio: plexShow.studio,
          
          guid: plexShow.guid,
          imdbId: guids.imdbId,
          tmdbId: guids.tmdbId,
          tvdbId: guids.tvdbId,
          
          posterUrl: plexShow.thumb,
          artUrl: plexShow.art,
          thumbUrl: plexShow.thumb,
          bannerUrl: plexShow.banner,
          
          genres: (plexShow.Genre || []).map(g => g.tag),
          actors: (plexShow.Role || []).slice(0, 10).map(r => ({
            name: r.tag,
            role: r.role,
            thumb: r.thumb
          })),
          
          libraryId: plexShow.libraryId,
          libraryName: plexShow.libraryName,
          
          addedAt: plexShow.addedAt ? new Date(plexShow.addedAt * 1000) : null,
          updatedAt: plexShow.updatedAt ? new Date(plexShow.updatedAt * 1000) : null,
          lastSyncedAt: new Date()
        };

        // Upsert show
        const showResult = await TVShow.updateOne(
          { plexId: plexShow.ratingKey, serverId: this.server._id },
          { $set: showData },
          { upsert: true }
        );

        // Get the show document for ID reference
        const show = await TVShow.findOne({ plexId: plexShow.ratingKey, serverId: this.server._id });

        if (showResult.upsertedCount > 0) {
          this.job.showsAdded++;
        } else if (showResult.modifiedCount > 0) {
          this.job.showsUpdated++;
        }

        // Sync seasons and episodes
        await this.syncSeasons(show, plexShow.ratingKey);

        // Update show stats
        await this.updateShowStats(show._id);

        this.job.processedItems++;

        // Save progress periodically
        if (this.job.processedItems % 5 === 0) {
          await this.updateJob({
            processedItems: this.job.processedItems,
            showsAdded: this.job.showsAdded,
            showsUpdated: this.job.showsUpdated,
            episodesAdded: this.job.episodesAdded,
            episodesUpdated: this.job.episodesUpdated
          });
        }

      } catch (error) {
        console.error(`Error syncing show ${plexShow.title}:`, error.message);
      }
    }

    // Final update
    await this.updateJob({
      processedItems: this.job.processedItems,
      showsAdded: this.job.showsAdded,
      showsUpdated: this.job.showsUpdated,
      episodesAdded: this.job.episodesAdded,
      episodesUpdated: this.job.episodesUpdated
    });

    console.log(`TV show sync complete: ${this.job.showsAdded} shows added, ${this.job.episodesAdded} episodes added`);
  }

  /**
   * Sync seasons for a show
   */
  async syncSeasons(show, showRatingKey) {
    const plexSeasons = await this.plexService.getChildren(showRatingKey);

    for (const plexSeason of plexSeasons) {
      // Skip "All episodes" pseudo-season
      if (plexSeason.index === undefined || plexSeason.index === null) continue;

      const seasonData = {
        plexId: plexSeason.ratingKey,
        serverId: this.server._id,
        showId: show._id,
        
        title: plexSeason.title,
        seasonNumber: plexSeason.index,
        summary: plexSeason.summary,
        
        posterUrl: plexSeason.thumb,
        thumbUrl: plexSeason.thumb,
        
        addedAt: plexSeason.addedAt ? new Date(plexSeason.addedAt * 1000) : null,
        updatedAt: plexSeason.updatedAt ? new Date(plexSeason.updatedAt * 1000) : null,
        lastSyncedAt: new Date()
      };

      await Season.updateOne(
        { plexId: plexSeason.ratingKey, serverId: this.server._id },
        { $set: seasonData },
        { upsert: true }
      );

      const season = await Season.findOne({ plexId: plexSeason.ratingKey, serverId: this.server._id });

      // Sync episodes
      await this.syncEpisodes(show, season, plexSeason.ratingKey);

      // Update season stats
      await this.updateSeasonStats(season._id);
    }
  }

  /**
   * Sync episodes for a season
   */
  async syncEpisodes(show, season, seasonRatingKey) {
    const plexEpisodes = await this.plexService.getChildren(seasonRatingKey);

    for (const plexEpisode of plexEpisodes) {
      try {
        // Get detailed metadata for media info
        const details = await this.plexService.getMetadata(plexEpisode.ratingKey);
        const mediaInfo = this.plexService.parseMediaInfo(details);
        const guids = this.plexService.parseGuids(details);

        const episodeData = {
          plexId: plexEpisode.ratingKey,
          serverId: this.server._id,
          showId: show._id,
          seasonId: season._id,
          
          title: plexEpisode.title,
          seasonNumber: plexEpisode.parentIndex,
          episodeNumber: plexEpisode.index,
          summary: plexEpisode.summary,
          contentRating: plexEpisode.contentRating,
          rating: plexEpisode.rating,
          
          guid: plexEpisode.guid,
          imdbId: guids.imdbId,
          tmdbId: guids.tmdbId,
          tvdbId: guids.tvdbId,
          
          thumbUrl: plexEpisode.thumb,
          
          directors: (plexEpisode.Director || []).map(d => d.tag),
          writers: (plexEpisode.Writer || []).map(w => w.tag),
          
          media: mediaInfo ? {
            ...mediaInfo,
            resolution: getResolution(mediaInfo.width, mediaInfo.height),
            videoCodec: normalizeVideoCodec(mediaInfo.videoCodec),
            audioCodec: normalizeAudioCodec(mediaInfo.audioCodec),
            container: normalizeContainer(mediaInfo.container)
          } : null,
          
          libraryId: show.libraryId,
          libraryName: show.libraryName,
          
          originallyAiredAt: plexEpisode.originallyAvailableAt 
            ? new Date(plexEpisode.originallyAvailableAt) 
            : null,
          addedAt: plexEpisode.addedAt ? new Date(plexEpisode.addedAt * 1000) : null,
          updatedAt: plexEpisode.updatedAt ? new Date(plexEpisode.updatedAt * 1000) : null,
          lastSyncedAt: new Date()
        };

        const result = await Episode.updateOne(
          { plexId: plexEpisode.ratingKey, serverId: this.server._id },
          { $set: episodeData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          this.job.episodesAdded++;
        } else if (result.modifiedCount > 0) {
          this.job.episodesUpdated++;
        }

      } catch (error) {
        console.error(`Error syncing episode ${plexEpisode.title}:`, error.message);
      }
    }
  }

  /**
   * Update season statistics
   */
  async updateSeasonStats(seasonId) {
    const stats = await Episode.aggregate([
      { $match: { seasonId: seasonId } },
      {
        $group: {
          _id: null,
          episodeCount: { $sum: 1 },
          totalFileSize: { $sum: '$media.fileSize' }
        }
      }
    ]);

    if (stats.length > 0) {
      await Season.updateOne(
        { _id: seasonId },
        {
          $set: {
            episodeCount: stats[0].episodeCount,
            totalFileSize: stats[0].totalFileSize || 0
          }
        }
      );
    }
  }

  /**
   * Update show statistics
   */
  async updateShowStats(showId) {
    // Get episode stats
    const episodeStats = await Episode.aggregate([
      { $match: { showId: showId } },
      {
        $group: {
          _id: null,
          episodeCount: { $sum: 1 },
          totalFileSize: { $sum: '$media.fileSize' }
        }
      }
    ]);

    // Get season count
    const seasonCount = await Season.countDocuments({ showId: showId });

    // Get dominant resolution and codec
    const resolutionStats = await Episode.aggregate([
      { $match: { showId: showId, 'media.resolution': { $exists: true } } },
      { $group: { _id: '$media.resolution', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const codecStats = await Episode.aggregate([
      { $match: { showId: showId, 'media.videoCodec': { $exists: true } } },
      { $group: { _id: '$media.videoCodec', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    await TVShow.updateOne(
      { _id: showId },
      {
        $set: {
          seasonCount: seasonCount,
          episodeCount: episodeStats[0]?.episodeCount || 0,
          totalFileSize: episodeStats[0]?.totalFileSize || 0,
          dominantResolution: resolutionStats[0]?._id || null,
          dominantVideoCodec: codecStats[0]?._id || null
        }
      }
    );
  }

  /**
   * Update job progress
   */
  async updateJob(updates) {
    Object.assign(this.job, updates);
    await SyncJob.updateOne(
      { _id: this.job._id },
      { $set: updates }
    );
  }

  /**
   * Mark job as completed
   */
  async completeJob() {
    await SyncJob.updateOne(
      { _id: this.job._id },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          processedItems: this.job.processedItems,
          moviesAdded: this.job.moviesAdded,
          moviesUpdated: this.job.moviesUpdated,
          showsAdded: this.job.showsAdded,
          showsUpdated: this.job.showsUpdated,
          episodesAdded: this.job.episodesAdded,
          episodesUpdated: this.job.episodesUpdated
        }
      }
    );
    currentSyncJob = null;
  }

  /**
   * Mark job as failed
   */
  async failJob(errorMessage) {
    await SyncJob.updateOne(
      { _id: this.job._id },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          error: errorMessage
        }
      }
    );
    currentSyncJob = null;
  }
}

module.exports = SyncService;
