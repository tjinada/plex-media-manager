const express = require('express');
const router = express.Router();
const tautulliController = require('../controllers/tautulli.controller');

// Configuration
router.get('/config', tautulliController.getConfig);
router.post('/config', tautulliController.saveConfig);
router.delete('/config', tautulliController.deleteConfig);

// Connection test
router.post('/test', tautulliController.testConnection);

// Sync settings
router.patch('/sync-settings', tautulliController.updateSyncSettings);

// Stats & Activity
router.get('/stats', tautulliController.getStats);
router.get('/activity', tautulliController.getActivity);

// Historical Import
router.post('/import', tautulliController.startImport);
router.get('/import/status', tautulliController.getImportStatus);
router.post('/import/cancel', tautulliController.cancelImport);

module.exports = router;
