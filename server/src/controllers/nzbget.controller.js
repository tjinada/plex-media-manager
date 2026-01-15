const nzbgetService = require('../services/nzbget.service');

/**
 * Get NZBGet configuration
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await nzbgetService.getConfig();

    res.json({
      configured: !!config,
      config: config || null
    });
  } catch (error) {
    console.error('Error getting NZBGet config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save NZBGet configuration
 */
exports.saveConfig = async (req, res) => {
  try {
    const { host, username, password } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }

    await nzbgetService.saveConfig(host, username, password);
    const config = await nzbgetService.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error saving NZBGet config:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete NZBGet configuration
 */
exports.deleteConfig = async (req, res) => {
  try {
    await nzbgetService.deleteConfig();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting NZBGet config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test NZBGet connection
 */
exports.testConnection = async (req, res) => {
  try {
    const { host, username, password } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }

    const result = await nzbgetService.testConnection(host, username, password);

    res.json(result);
  } catch (error) {
    console.error('Error testing NZBGet connection:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get NZBGet download queue
 */
exports.getQueue = async (req, res) => {
  try {
    const queue = await nzbgetService.getQueue();

    res.json(queue);
  } catch (error) {
    console.error('Error getting NZBGet queue:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get NZBGet download history
 */
exports.getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await nzbgetService.getHistory(limit);

    res.json({ history });
  } catch (error) {
    console.error('Error getting NZBGet history:', error);
    res.status(500).json({ error: error.message });
  }
};
