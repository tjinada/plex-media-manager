const sonarrService = require('../services/sonarr.service');

// Get Sonarr configuration
exports.getConfig = async (req, res, next) => {
  try {
    const config = await sonarrService.getConfig();
    res.json({ config });
  } catch (error) {
    next(error);
  }
};

// Save Sonarr configuration
exports.saveConfig = async (req, res, next) => {
  try {
    const { host, apiKey } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ 
        error: { message: 'Host and API key are required' } 
      });
    }

    const config = await sonarrService.saveConfig(host, apiKey);
    
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

// Delete Sonarr configuration
exports.deleteConfig = async (req, res, next) => {
  try {
    await sonarrService.deleteConfig();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Test Sonarr connection
exports.testConnection = async (req, res, next) => {
  try {
    const { host, apiKey } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ 
        error: { message: 'Host and API key are required' } 
      });
    }

    const result = await sonarrService.testConnection(host, apiKey);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get missing episodes
exports.getMissing = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    const result = await sonarrService.getMissing(page, pageSize);
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

    const result = await sonarrService.getUpgrades(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get downgrade candidates
exports.getDowngrades = async (req, res, next) => {
  try {
    const result = await sonarrService.getDowngrades();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Trigger search for an episode
exports.triggerSearch = async (req, res, next) => {
  try {
    const { sonarrId } = req.params;

    if (!sonarrId) {
      return res.status(400).json({ 
        error: { message: 'Sonarr episode ID is required' } 
      });
    }

    const result = await sonarrService.triggerSearch(sonarrId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get Sonarr stats for dashboard
exports.getStats = async (req, res, next) => {
  try {
    const stats = await sonarrService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
