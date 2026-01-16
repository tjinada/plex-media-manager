const { TautulliConfig } = require('../models');
const TautulliService = require('../services/tautulli.service');
const tautulliSyncService = require('../services/tautulli-sync.service');

/**
 * Get Tautulli configuration
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await TautulliConfig.getConfig();
    
    if (!config) {
      return res.json({
        configured: false,
        config: null
      });
    }

    // Return config without the actual API key
    res.json({
      configured: true,
      config: {
        host: config.host,
        externalUrl: config.externalUrl || null,
        enabled: config.enabled,
        isConnected: config.isConnected,
        serverName: config.serverName,
        version: config.version,
        syncEnabled: config.syncEnabled,
        syncIntervalSeconds: config.syncIntervalSeconds,
        lastSyncAt: config.lastSyncAt,
        lastSyncSessionCount: config.lastSyncSessionCount,
        historyImported: config.historyImported,
        historyImportedAt: config.historyImportedAt,
        totalSessionsImported: config.totalSessionsImported,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting Tautulli config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save Tautulli configuration
 */
exports.saveConfig = async (req, res) => {
  try {
    const { host, apiKey, externalUrl, enabled, syncEnabled, syncIntervalSeconds } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ error: 'Host and API key are required' });
    }

    // Validate host URL format
    let normalizedHost = host.trim();
    if (!normalizedHost.startsWith('http://') && !normalizedHost.startsWith('https://')) {
      normalizedHost = 'http://' + normalizedHost;
    }

    // Normalize external URL if provided
    let normalizedExternalUrl = null;
    if (externalUrl) {
      normalizedExternalUrl = externalUrl.trim().replace(/\/$/, '');
    }

    // Test connection before saving
    const tautulli = new TautulliService(normalizedHost, apiKey);
    let connectionInfo;
    
    try {
      connectionInfo = await tautulli.testConnection();
    } catch (error) {
      return res.status(400).json({ 
        error: 'Failed to connect to Tautulli',
        details: error.message 
      });
    }

    // Save configuration
    const config = await TautulliConfig.saveConfig({
      host: normalizedHost,
      externalUrl: normalizedExternalUrl,
      apiKey: apiKey,
      enabled: enabled !== false,
      isConnected: true,
      serverName: connectionInfo.plexName || connectionInfo.serverName,
      version: connectionInfo.version,
      syncEnabled: syncEnabled !== false,
      syncIntervalSeconds: syncIntervalSeconds || 60
    });

    // Start real-time sync if enabled
    if (config.syncEnabled) {
      tautulliSyncService.startRealtimeSync();
    }

    res.json({
      success: true,
      message: 'Tautulli configuration saved',
      config: {
        host: config.host,
        externalUrl: config.externalUrl || null,
        enabled: config.enabled,
        isConnected: config.isConnected,
        serverName: config.serverName,
        version: config.version,
        syncEnabled: config.syncEnabled,
        syncIntervalSeconds: config.syncIntervalSeconds
      },
      connectionInfo
    });
  } catch (error) {
    console.error('Error saving Tautulli config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test Tautulli connection
 */
exports.testConnection = async (req, res) => {
  try {
    const { host, apiKey } = req.body;

    if (!host || !apiKey) {
      return res.status(400).json({ error: 'Host and API key are required' });
    }

    // Normalize host URL
    let normalizedHost = host.trim();
    if (!normalizedHost.startsWith('http://') && !normalizedHost.startsWith('https://')) {
      normalizedHost = 'http://' + normalizedHost;
    }

    const tautulli = new TautulliService(normalizedHost, apiKey);
    const connectionInfo = await tautulli.testConnection();

    // Also get history count for import estimation
    const historyCount = await tautulli.getHistoryCount();

    res.json({
      success: true,
      ...connectionInfo,
      historyCount,
      estimatedImportTime: Math.ceil(historyCount / 100) + ' seconds' // ~100 records per second
    });
  } catch (error) {
    console.error('Error testing Tautulli connection:', error);
    res.status(400).json({ 
      success: false,
      error: 'Connection failed',
      details: error.message 
    });
  }
};

/**
 * Delete Tautulli configuration
 */
exports.deleteConfig = async (req, res) => {
  try {
    // Stop real-time sync
    tautulliSyncService.stopRealtimeSync();
    
    await TautulliConfig.deleteMany({});
    
    res.json({
      success: true,
      message: 'Tautulli configuration removed'
    });
  } catch (error) {
    console.error('Error deleting Tautulli config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get Tautulli stats (for dashboard)
 */
exports.getStats = async (req, res) => {
  try {
    const config = await TautulliConfig.getConfig();
    
    if (!config) {
      return res.status(404).json({ error: 'Tautulli not configured' });
    }

    const tautulli = new TautulliService(config.host, config.getDecryptedApiKey());
    
    const [streamType, platforms, users] = await Promise.all([
      tautulli.getPlaysByStreamType({ timeRange: 30 }),
      tautulli.getPlaysByTopPlatforms({ timeRange: 30 }),
      tautulli.getPlaysByTopUsers({ timeRange: 30 })
    ]);

    res.json({
      streamType,
      platforms,
      users
    });
  } catch (error) {
    console.error('Error getting Tautulli stats:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current activity from Tautulli
 */
exports.getActivity = async (req, res) => {
  try {
    const config = await TautulliConfig.getConfig();
    
    if (!config) {
      return res.status(404).json({ error: 'Tautulli not configured' });
    }

    const tautulli = new TautulliService(config.host, config.getDecryptedApiKey());
    const activity = await tautulli.getActivity();

    res.json(activity);
  } catch (error) {
    console.error('Error getting Tautulli activity:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update sync settings
 */
exports.updateSyncSettings = async (req, res) => {
  try {
    const { syncEnabled, syncIntervalSeconds, externalUrl } = req.body;

    const config = await TautulliConfig.getConfig();
    
    if (!config) {
      return res.status(404).json({ error: 'Tautulli not configured' });
    }

    if (syncEnabled !== undefined) {
      config.syncEnabled = syncEnabled;
    }
    
    if (syncIntervalSeconds !== undefined) {
      config.syncIntervalSeconds = Math.max(30, Math.min(3600, syncIntervalSeconds));
    }

    if (externalUrl !== undefined) {
      config.externalUrl = externalUrl ? externalUrl.trim().replace(/\/$/, '') : null;
    }

    await config.save();

    // Restart sync with new settings
    tautulliSyncService.stopRealtimeSync();
    if (config.syncEnabled) {
      tautulliSyncService.startRealtimeSync();
    }

    res.json({
      success: true,
      syncEnabled: config.syncEnabled,
      syncIntervalSeconds: config.syncIntervalSeconds,
      externalUrl: config.externalUrl || null
    });
  } catch (error) {
    console.error('Error updating sync settings:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Start historical import
 */
exports.startImport = async (req, res) => {
  try {
    const result = await tautulliSyncService.startHistoricalImport();
    res.json(result);
  } catch (error) {
    console.error('Error starting import:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get import status
 */
exports.getImportStatus = async (req, res) => {
  try {
    const status = tautulliSyncService.getImportStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting import status:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel import
 */
exports.cancelImport = async (req, res) => {
  try {
    const result = tautulliSyncService.cancelImport();
    res.json(result);
  } catch (error) {
    console.error('Error cancelling import:', error);
    res.status(500).json({ error: error.message });
  }
};
