const { PlexServer } = require('../models');
const PlexService = require('../services/plex.service');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Validate Plex token by testing connection
 */
exports.validateToken = async (req, res, next) => {
  try {
    const { host, token } = req.body;

    if (!host || !token) {
      throw new ApiError(400, 'Host and token are required', 'VALIDATION_ERROR');
    }

    const plexService = new PlexService(host, token);
    const serverInfo = await plexService.testConnection();

    res.json({
      success: true,
      server: serverInfo
    });

  } catch (error) {
    next(error);
  }
};
