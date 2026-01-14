const transcodingService = require('../services/transcoding.service');

/**
 * Get transcoding summary
 */
exports.getSummary = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const summary = await transcodingService.getSummary({ period, userId });
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Get decisions over time for charting
 */
exports.getDecisionsOverTime = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const data = await transcodingService.getDecisionsOverTime({ period, userId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get transcode reasons breakdown
 */
exports.getTranscodeReasons = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const data = await transcodingService.getTranscodeReasons({ period, userId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stats grouped by device
 */
exports.getByDevice = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const data = await transcodingService.getByDevice({ period, userId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stats grouped by format
 */
exports.getByFormat = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const data = await transcodingService.getByFormat({ period, userId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get problematic format combinations
 */
exports.getCombinations = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const data = await transcodingService.getCombinations({ period, userId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get top transcoding media items
 */
exports.getByMedia = async (req, res, next) => {
  try {
    const { period = '30d', userId, page = 1, limit = 20 } = req.query;
    const data = await transcodingService.getByMedia({
      period,
      userId,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of users for filter dropdown
 */
exports.getUsers = async (req, res, next) => {
  try {
    const data = await transcodingService.getUsers();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get smart recommendations
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const { period = '30d', userId } = req.query;
    const data = await transcodingService.getRecommendations({ period, userId });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated session list
 */
exports.getSessions = async (req, res, next) => {
  try {
    const { period = '30d', userId, decision, page = 1, limit = 50 } = req.query;
    const data = await transcodingService.getSessions({
      period,
      userId,
      decision,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get media items for a specific codec
 */
exports.getMediaByCodec = async (req, res, next) => {
  try {
    const { 
      period = '30d', 
      userId, 
      codecType, 
      codecValue,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const data = await transcodingService.getMediaByCodec({
      period,
      userId,
      codecType,
      codecValue,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};
