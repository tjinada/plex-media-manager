const express = require('express');
const router = express.Router();
const radarrController = require('../controllers/radarr.controller');

// Configuration
router.get('/config', radarrController.getConfig);
router.post('/config', radarrController.saveConfig);
router.patch('/config', radarrController.updateConfig);
router.delete('/config', radarrController.deleteConfig);
router.post('/test', radarrController.testConnection);

// Stats (for dashboard)
router.get('/stats', radarrController.getStats);

// Missing (released but not downloaded)
router.get('/missing', radarrController.getMissing);

// Upcoming (not yet released)
router.get('/upcoming', radarrController.getUpcoming);

// Upgrades & Downgrades
router.get('/upgrades', radarrController.getUpgrades);
router.get('/downgrades', radarrController.getDowngrades);

// Search
router.post('/search/:radarrId', radarrController.triggerSearch);

// Interactive Search
router.get('/search/:movieId/results', radarrController.getSearchResults);
router.post('/download', radarrController.downloadRelease);

module.exports = router;
