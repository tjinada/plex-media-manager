const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');

// POST /api/sync - Trigger sync
router.post('/', syncController.triggerSync);

// GET /api/sync/status - Get sync status
router.get('/status', syncController.getSyncStatus);

// GET /api/sync/history - Get sync history
router.get('/history', syncController.getSyncHistory);

module.exports = router;
