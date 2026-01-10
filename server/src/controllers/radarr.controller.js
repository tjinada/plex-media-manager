const radarrService = require('../services/radarr.service');

// Get Radarr configuration
exports.getConfig = async (req, res, next) => {
  try {
    const config = await radarrService.getConfig();
    res.json({ config });
  } catch (error) {
    next(error);
  }
};

// Save Radarr configuration
exports.saveConfig = async (req, res, next) => {
  try {
    const { host, apiKey, maxMovieSize } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ 
        error: { message: 'Host and API key are required' } 
      });
    }

    const config = await radarrService.saveConfig(host, apiKey, maxMovieSize);
    
    res.json({ 
      success: true,
      config: {
        host: config.host,
        enabled: config.enabled,
        isConnected: config.isConnected,
        version: config.version,
        maxMovieSize: config.maxMovieSize
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Radarr configuration (for settings like max size)
exports.updateConfig = async (req, res, next) => {
  try {
    const { maxMovieSize } = req.body;

    const config = await radarrService.updateConfig({ maxMovieSize });
    
    res.json({ 
      success: true,
      config: {
        host: config.host,
        enabled: config.enabled,
        isConnected: config.isConnected,
        version: config.version,
        maxMovieSize: config.maxMovieSize
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete Radarr configuration
exports.deleteConfig = async (req, res, next) => {
  try {
    await radarrService.deleteConfig();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Test Radarr connection
exports.testConnection = async (req, res, next) => {
  try {
    const { host, apiKey } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ 
        error: { message: 'Host and API key are required' } 
      });
    }

    const result = await radarrService.testConnection(host, apiKey);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get missing movies (released but not downloaded)
exports.getMissing = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    const result = await radarrService.getMissing(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get upcoming movies (not yet released)
exports.getUpcoming = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    const result = await radarrService.getUpcoming(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get upgrade candidates
exports.getUpgrades = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    const result = await radarrService.getUpgrades(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get downgrade candidates
exports.getDowngrades = async (req, res, next) => {
  try {
    const result = await radarrService.getDowngrades();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Trigger search for a movie
exports.triggerSearch = async (req, res, next) => {
  try {
    const { radarrId } = req.params;

    if (!radarrId) {
      return res.status(400).json({ 
        error: { message: 'Radarr movie ID is required' } 
      });
    }

    const result = await radarrService.triggerSearch(radarrId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get Radarr stats for dashboard
exports.getStats = async (req, res, next) => {
  try {
    const stats = await radarrService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Get interactive search results for a movie
exports.getSearchResults = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ 
        error: { message: 'Movie ID is required' } 
      });
    }

    const results = await radarrService.getInteractiveSearchResults(movieId);
    res.json({ releases: results });
  } catch (error) {
    next(error);
  }
};

// Download a specific release
exports.downloadRelease = async (req, res, next) => {
  try {
    const { guid, indexerId } = req.body;

    if (!guid || indexerId === undefined) {
      return res.status(400).json({ 
        error: { message: 'GUID and indexerId are required' } 
      });
    }

    const result = await radarrService.downloadRelease(guid, indexerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
