const watchHistoryService = require('../services/watch-history.service');

/**
 * Get watch history analysis
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
 * Get movies with watch status
 */
exports.getMovies = async (req, res, next) => {
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

    const result = await watchHistoryService.getMovies({
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
 * Get episodes with watch status
 */
exports.getEpisodes = async (req, res, next) => {
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

    const result = await watchHistoryService.getEpisodes({
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
 * Get TV shows with watch status aggregation
 */
exports.getShows = async (req, res, next) => {
  try {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all',
      sortBy = 'staleEpisodes',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const result = await watchHistoryService.getShows({
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
