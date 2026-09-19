const express = require('express');
const router = express.Router();
const kidsController = require('../controllers/kids.controller');

// Configuration
router.get('/config', kidsController.getConfig);
router.post('/config', kidsController.saveConfig);

// Reconcile (?dryRun=true for a no-op plan)
router.post('/reconcile', kidsController.runReconcile);

// Per-item curation
router.put('/items/:ratingKey/label', kidsController.setItemLabel);

// Quarantine review
router.get('/quarantine', kidsController.getQuarantine);

module.exports = router;
