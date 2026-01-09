const compatibilityService = require('../services/compatibility.service');
const { Movie, PlexServer } = require('../models');
const PlexService = require('../services/plex.service');

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
 * Debug: Get HDR info for a specific movie by title
 * Compares database vs live Plex API data
 */
exports.debugMovieHdr = async (req, res, next) => {
  try {
    const { title } = req.query;
    
    if (!title) {
      return res.status(400).json({ error: 'Title query parameter required' });
    }
    
    // Get ALL movies matching title from database (to catch duplicates)
    const movies = await Movie.find({ 
      title: { $regex: title, $options: 'i' } 
    }).lean();
    
    if (movies.length === 0) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }
    
    const server = await PlexServer.getServer();
    const plexService = server ? new PlexService(server.host, server.token) : null;
    
    // Check each movie found
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
 * Cleanup: Remove orphaned movies (plexId no longer exists in Plex)
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
    
    // If confirmed, delete orphans
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
