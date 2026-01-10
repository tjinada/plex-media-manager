const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');

// POST /api/sync - Trigger sync
router.post('/', syncController.triggerSync);

// GET /api/sync/status - Get sync status
router.get('/status', syncController.getSyncStatus);

// GET /api/sync/history - Get sync history
router.get('/history', syncController.getSyncHistory);

// GET /api/sync/auto-sync - Get auto-sync settings
router.get('/auto-sync', syncController.getAutoSyncSettings);

// PUT /api/sync/auto-sync - Update auto-sync settings
router.put('/auto-sync', syncController.updateAutoSyncSettings);

module.exports = router;
