const SyncService = require('../services/sync.service');
const autoSyncService = require('../services/auto-sync.service');
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

/**
 * Get auto-sync settings
 */
exports.getAutoSyncSettings = async (req, res, next) => {
  try {
    const settings = await autoSyncService.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Update auto-sync settings
 */
exports.updateAutoSyncSettings = async (req, res, next) => {
  try {
    const { enabled, intervalMinutes } = req.body;

    if (typeof enabled !== 'boolean') {
      throw new ApiError(400, 'enabled must be a boolean', 'VALIDATION_ERROR');
    }

    if (typeof intervalMinutes !== 'number' || intervalMinutes < 5 || intervalMinutes > 1440) {
      throw new ApiError(400, 'intervalMinutes must be a number between 5 and 1440', 'VALIDATION_ERROR');
    }

    const settings = await autoSyncService.updateSettings(enabled, intervalMinutes);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};
