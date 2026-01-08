const SyncService = require('../services/sync.service');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Trigger a library sync
 */
exports.triggerSync = async (req, res, next) => {
  try {
    const { type = 'full' } = req.body;

    if (!['full', 'movies', 'shows'].includes(type)) {
      throw new ApiError(400, 'Invalid sync type', 'VALIDATION_ERROR');
    }

    const syncService = new SyncService();
    const job = await syncService.startSync(type);

    res.json({
      jobId: job._id,
      status: job.status
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get current sync status
 */
exports.getSyncStatus = async (req, res, next) => {
  try {
    const status = await SyncService.getStatus();
    res.json(status);

  } catch (error) {
    next(error);
  }
};

/**
 * Get sync history
 */
exports.getSyncHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const jobs = await SyncService.getHistory(limit);

    res.json({ jobs });

  } catch (error) {
    next(error);
  }
};
