const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

router.get('/overview', statsController.getOverview);
router.get('/resolution', statsController.getResolutionDistribution);
router.get('/codecs', statsController.getCodecDistribution);
router.get('/containers', statsController.getContainerDistribution);
router.get('/storage', statsController.getStorageStats);

module.exports = router;
