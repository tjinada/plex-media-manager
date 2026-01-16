const express = require('express');
const router = express.Router();
const qbittorrentController = require('../controllers/qbittorrent.controller');

// Configuration endpoints
router.get('/config', qbittorrentController.getConfig);
router.post('/config', qbittorrentController.saveConfig);
router.patch('/config', qbittorrentController.updateConfig);
router.delete('/config', qbittorrentController.deleteConfig);

// Connection test
router.post('/test', qbittorrentController.testConnection);

// Queue
router.get('/queue', qbittorrentController.getQueue);

module.exports = router;
