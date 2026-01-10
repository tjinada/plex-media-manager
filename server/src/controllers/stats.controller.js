const statsService = require('../services/stats.service');

const getOverview = async (req, res, next) => {
  try {
    const overview = await statsService.getOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
};

const getResolutionDistribution = async (req, res, next) => {
  try {
    const distribution = await statsService.getResolutionDistribution();
    res.json(distribution);
  } catch (error) {
    next(error);
  }
};

const getCodecDistribution = async (req, res, next) => {
  try {
    const distribution = await statsService.getCodecDistribution();
    res.json(distribution);
  } catch (error) {
    next(error);
  }
};

const getContainerDistribution = async (req, res, next) => {
  try {
    const distribution = await statsService.getContainerDistribution();
    res.json(distribution);
  } catch (error) {
    next(error);
  }
};

const getStorageStats = async (req, res, next) => {
  try {
    const storage = await statsService.getStorageStats();
    res.json(storage);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getResolutionDistribution,
  getCodecDistribution,
  getContainerDistribution,
  getStorageStats
};
