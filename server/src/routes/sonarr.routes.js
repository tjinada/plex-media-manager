const express = require('express');
const router = express.Router();
const sonarrController = require('../controllers/sonarr.controller');

// Configuration
router.get('/config', sonarrController.getConfig);
router.post('/config', sonarrController.saveConfig);
router.delete('/config', sonarrController.deleteConfig);
router.post('/test', sonarrController.testConnection);

// Stats (for dashboard)
router.get('/stats', sonarrController.getStats);

// Missing (aired but not downloaded)
router.get('/missing', sonarrController.getMissing);

// Upcoming (not yet aired)
router.get('/upcoming', sonarrController.getUpcoming);

// Upgrades & Downgrades
router.get('/upgrades', sonarrController.getUpgrades);
router.get('/downgrades', sonarrController.getDowngrades);

// Search
router.post('/search/:sonarrId', sonarrController.triggerSearch);

module.exports = router;
