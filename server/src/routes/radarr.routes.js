const express = require('express');
const router = express.Router();
const radarrController = require('../controllers/radarr.controller');

// Configuration
router.get('/config', radarrController.getConfig);
router.post('/config', radarrController.saveConfig);
router.delete('/config', radarrController.deleteConfig);
router.post('/test', radarrController.testConnection);

// Stats (for dashboard)
router.get('/stats', radarrController.getStats);

// Missing & Upgrades & Downgrades
router.get('/missing', radarrController.getMissing);
router.get('/upgrades', radarrController.getUpgrades);
router.get('/downgrades', radarrController.getDowngrades);

// Search
router.post('/search/:radarrId', radarrController.triggerSearch);

module.exports = router;
