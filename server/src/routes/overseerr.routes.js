const express = require('express');
const router = express.Router();
const overseerrService = require('../services/overseerr.service');

// Get config
router.get('/config', async (req, res) => {
  try {
    const config = await overseerrService.getConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Test connection
router.post('/test', async (req, res) => {
  try {
    const { host, apiKey } = req.body;
    const result = await overseerrService.testConnection(host, apiKey);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Save config
router.post('/config', async (req, res) => {
  try {
    const { host, apiKey } = req.body;
    const config = await overseerrService.saveConfig(host, apiKey);
    res.json({ 
      success: true, 
      config: {
        host: config.host,
        enabled: config.enabled,
        isConnected: config.isConnected,
        version: config.version,
        lastCheckedAt: config.lastCheckedAt
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete config
router.delete('/config', async (req, res) => {
  try {
    await overseerrService.deleteConfig();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get requests
router.get('/requests', async (req, res) => {
  try {
    const { status, take, skip } = req.query;
    const result = await overseerrService.getRequests({
      status: status ? parseInt(status) : undefined,
      take: take ? parseInt(take) : 20,
      skip: skip ? parseInt(skip) : 0
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending count
router.get('/requests/count', async (req, res) => {
  try {
    const count = await overseerrService.getPendingCount();
    res.json({ pending: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve request
router.post('/requests/:id/approve', async (req, res) => {
  try {
    const result = await overseerrService.approveRequest(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Decline request
router.post('/requests/:id/decline', async (req, res) => {
  try {
    const result = await overseerrService.declineRequest(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await overseerrService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
