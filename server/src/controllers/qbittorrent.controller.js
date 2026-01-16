const qbittorrentService = require('../services/qbittorrent.service');

/**
 * Get qBittorrent configuration
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await qbittorrentService.getConfig();

    res.json({
      configured: !!config,
      config: config || null
    });
  } catch (error) {
    console.error('Error getting qBittorrent config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save qBittorrent configuration
 */
exports.saveConfig = async (req, res) => {
  try {
    const { host, username, password, externalUrl } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }

    await qbittorrentService.saveConfig(host, username, password, externalUrl);
    const config = await qbittorrentService.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error saving qBittorrent config:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update qBittorrent configuration
 */
exports.updateConfig = async (req, res) => {
  try {
    const { externalUrl } = req.body;

    await qbittorrentService.updateConfig({ externalUrl });
    const config = await qbittorrentService.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error updating qBittorrent config:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete qBittorrent configuration
 */
exports.deleteConfig = async (req, res) => {
  try {
    await qbittorrentService.deleteConfig();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting qBittorrent config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test qBittorrent connection
 */
exports.testConnection = async (req, res) => {
  try {
    const { host, username, password } = req.body;

    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }

    const result = await qbittorrentService.testConnection(host, username, password);

    res.json(result);
  } catch (error) {
    console.error('Error testing qBittorrent connection:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get qBittorrent torrent queue
 */
exports.getQueue = async (req, res) => {
  try {
    const queue = await qbittorrentService.getQueue();

    res.json(queue);
  } catch (error) {
    console.error('Error getting qBittorrent queue:', error);
    res.status(500).json({ error: error.message });
  }
};
