const express = require('express');
const router = express.Router();
const nzbgetController = require('../controllers/nzbget.controller');

// Configuration endpoints
router.get('/config', nzbgetController.getConfig);
router.post('/config', nzbgetController.saveConfig);
router.delete('/config', nzbgetController.deleteConfig);

// Connection test
router.post('/test', nzbgetController.testConnection);

// Queue and history
router.get('/queue', nzbgetController.getQueue);
router.get('/history', nzbgetController.getHistory);

module.exports = router;
