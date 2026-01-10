const compatibilityService = require('../services/compatibility.service');
const { Movie, Episode, TVShow, PlexServer } = require('../models');
const PlexService = require('../services/plex.service');
const radarrService = require('../services/radarr.service');
const sonarrService = require('../services/sonarr.service');

/**
 * Get all compatibility rules
 */
exports.getRules = async (req, res, next) => {
  try {
    const rules = compatibilityService.getRules();
    res.json({ rules });
  } catch (error) {
    next(error);
  }
};

/**
 * Get compatibility analysis summary
 */
exports.getAnalysis = async (req, res, next) => {
  try {
    const analysis = await compatibilityService.analyzeAll();
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of compatibility issues
 */
exports.getIssues = async (req, res, next) => {
  try {
    const {
      type = 'all',
      severity = 'all',
      ruleId = null,
      sortBy = 'severity',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const result = await compatibilityService.getIssues({
      type,
      severity,
      ruleId: ruleId || null,
      sortBy,
      sortOrder,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Interactive search for a movie via Radarr
 */
exports.searchMovie = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    
    // Get movie from our database
    const movie = await Movie.findById(movieId).lean();
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Initialize Radarr
    await radarrService.initialize();
    const radarrConfig = await radarrService.getConfig();
    
    if (!radarrConfig || !radarrConfig.enabled) {
      return res.status(400).json({ error: 'Radarr not configured' });
    }

    // Find movie in Radarr by TMDB ID or IMDB ID
    let radarrMovie = null;
    
    if (movie.tmdbId) {
      radarrMovie = await radarrService.lookupByTmdbId(movie.tmdbId);
    }
    
    if (!radarrMovie && movie.imdbId) {
      radarrMovie = await radarrService.lookupByImdbId(movie.imdbId);
    }

    if (!radarrMovie) {
      return res.status(404).json({ 
        error: 'Movie not found in Radarr',
        suggestion: 'Add this movie to Radarr first'
      });
    }

    // Get interactive search results
    const results = await radarrService.getInteractiveSearchResults(radarrMovie.id);

    res.json({
      movie: {
        title: movie.title,
        year: movie.year,
        radarrId: radarrMovie.id
      },
      radarrUrl: `${radarrConfig.host}/movie/${radarrMovie.id}`,
      results // Return all results, let frontend handle display
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Interactive search for an episode via Sonarr
 */
exports.searchEpisode = async (req, res, next) => {
  try {
    const { episodeId } = req.params;
    
    // Get episode from our database
    const episode = await Episode.findById(episodeId).populate('showId').lean();
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Initialize Sonarr
    await sonarrService.initialize();
    const sonarrConfig = await sonarrService.getConfig();
    
    if (!sonarrConfig || !sonarrConfig.enabled) {
      return res.status(400).json({ error: 'Sonarr not configured' });
    }

    // Find series in Sonarr by TVDB ID
    let sonarrSeries = null;
    const show = episode.showId;
    
    if (show?.tvdbId) {
      sonarrSeries = await sonarrService.lookupByTvdbId(show.tvdbId);
    }

    if (!sonarrSeries) {
      return res.status(404).json({ 
        error: 'Series not found in Sonarr',
        suggestion: 'Add this series to Sonarr first'
      });
    }

    // Find the specific episode in Sonarr
    const sonarrEpisode = await sonarrService.lookupEpisode(
      sonarrSeries.id,
      episode.seasonNumber,
      episode.episodeNumber
    );

    if (!sonarrEpisode) {
      return res.status(404).json({ 
        error: 'Episode not found in Sonarr',
        suggestion: 'The episode may not be monitored in Sonarr'
      });
    }

    // Get interactive search results
    const results = await sonarrService.getInteractiveSearchResults(sonarrEpisode.id);

    res.json({
      episode: {
        showTitle: show?.title,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        sonarrSeriesId: sonarrSeries.id,
        sonarrEpisodeId: sonarrEpisode.id
      },
      sonarrUrl: `${sonarrConfig.host}/series/${sonarrSeries.id}`,
      results // Return all results, let frontend handle display
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download a release from Radarr
 */
exports.downloadMovieRelease = async (req, res, next) => {
  try {
    const { guid, indexerId } = req.body;
    
    if (!guid || indexerId === undefined) {
      return res.status(400).json({ error: 'guid and indexerId are required' });
    }

    await radarrService.initialize();
    const result = await radarrService.downloadRelease(guid, indexerId);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Download a release from Sonarr
 */
exports.downloadEpisodeRelease = async (req, res, next) => {
  try {
    const { guid, indexerId } = req.body;
    
    if (!guid || indexerId === undefined) {
      return res.status(400).json({ error: 'guid and indexerId are required' });
    }

    await sonarrService.initialize();
    const result = await sonarrService.downloadRelease(guid, indexerId);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Debug: Get HDR info for a specific movie by title
 */
exports.debugMovieHdr = async (req, res, next) => {
  try {
    const { title } = req.query;
    
    if (!title) {
      return res.status(400).json({ error: 'Title query parameter required' });
    }
    
    const movies = await Movie.find({ 
      title: { $regex: title, $options: 'i' } 
    }).lean();
    
    if (movies.length === 0) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }
    
    const server = await PlexServer.getServer();
    const plexService = server ? new PlexService(server.host, server.token) : null;
    
    const results = await Promise.all(movies.map(async (movie) => {
      let plexLiveData = null;
      let plexStatus = 'unknown';
      
      if (plexService) {
        try {
          const metadata = await plexService.getMetadata(movie.plexId);
          const mediaInfo = plexService.parseMediaInfo(metadata);
          plexLiveData = {
            hdr: mediaInfo?.hdr || null,
            filePath: mediaInfo?.filePath
          };
          plexStatus = 'exists';
        } catch (err) {
          if (err.response?.status === 404) {
            plexStatus = 'deleted';
          } else {
            plexStatus = 'error: ' + err.message;
          }
        }
      }
      
      return {
        plexId: movie.plexId,
        lastSyncedAt: movie.lastSyncedAt,
        plexStatus,
        database: {
          hdr: movie.media?.hdr ? {
            doviProfile: movie.media.hdr.doviProfile,
            doviBLCompatID: movie.media.hdr.doviBLCompatID
          } : null,
          filePath: movie.media?.filePath
        },
        plexLive: plexLiveData
      };
    }));
    
    res.json({
      title: movies[0].title,
      year: movies[0].year,
      recordsFound: movies.length,
      records: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup: Remove orphaned movies
 */
exports.cleanupOrphans = async (req, res, next) => {
  try {
    const server = await PlexServer.getServer();
    if (!server) {
      return res.status(400).json({ error: 'No Plex server configured' });
    }
    
    const plexService = new PlexService(server.host, server.token);
    const movies = await Movie.find({}).lean();
    
    const orphans = [];
    
    for (const movie of movies) {
      try {
        await plexService.getMetadata(movie.plexId);
      } catch (err) {
        if (err.response?.status === 404) {
          orphans.push({
            id: movie._id,
            plexId: movie.plexId,
            title: movie.title,
            year: movie.year
          });
        }
      }
    }
    
    if (req.query.confirm === 'true' && orphans.length > 0) {
      const ids = orphans.map(o => o.id);
      await Movie.deleteMany({ _id: { $in: ids } });
      return res.json({ 
        message: `Deleted ${orphans.length} orphaned movies`,
        deleted: orphans 
      });
    }
    
    res.json({
      orphanCount: orphans.length,
      orphans,
      message: orphans.length > 0 
        ? 'Add ?confirm=true to delete these orphaned records' 
        : 'No orphaned movies found'
    });
  } catch (error) {
    next(error);
  }
};
