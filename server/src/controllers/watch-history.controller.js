const watchHistoryService = require('../services/watch-history.service');

/**
 * Get watch history analysis summary
 */
exports.getAnalysis = async (req, res, next) => {
  try {
    const { staleThresholdDays = 365, minAgeToConsiderDays = 30 } = req.query;
    
    const analysis = await watchHistoryService.getAnalysis({
      staleThresholdDays: parseInt(staleThresholdDays),
      minAgeToConsiderDays: parseInt(minAgeToConsiderDays)
    });

    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stale movies
 */
exports.getStaleMovies = async (req, res, next) => {
  try {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all',
      sortBy = 'fileSize',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const result = await watchHistoryService.getStaleMovies({
      staleThresholdDays: parseInt(staleThresholdDays),
      minAgeToConsiderDays: parseInt(minAgeToConsiderDays),
      filter,
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
 * Get stale episodes
 */
exports.getStaleEpisodes = async (req, res, next) => {
  try {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all',
      sortBy = 'fileSize',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const result = await watchHistoryService.getStaleEpisodes({
      staleThresholdDays: parseInt(staleThresholdDays),
      minAgeToConsiderDays: parseInt(minAgeToConsiderDays),
      filter,
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
 * Get stale shows (aggregated by show)
 */
exports.getStaleShows = async (req, res, next) => {
  try {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      sortBy = 'staleEpisodes',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const result = await watchHistoryService.getStaleShows({
      staleThresholdDays: parseInt(staleThresholdDays),
      minAgeToConsiderDays: parseInt(minAgeToConsiderDays),
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
