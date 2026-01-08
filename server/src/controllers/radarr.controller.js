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
    const { host, apiKey } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ 
        error: { message: 'Host and API key are required' } 
      });
    }

    const config = await radarrService.saveConfig(host, apiKey);
    
    res.json({ 
      success: true,
      config: {
        host: config.host,
        enabled: config.enabled,
        isConnected: config.isConnected,
        version: config.version
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
