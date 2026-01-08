const express = require('express');
const router = express.Router();
const compatibilityController = require('../controllers/compatibility.controller');

// GET /api/compatibility/rules - Get all compatibility rules
router.get('/rules', compatibilityController.getRules);

// GET /api/compatibility/analysis - Get compatibility analysis summary
router.get('/analysis', compatibilityController.getAnalysis);

// GET /api/compatibility/issues - Get list of issues with filtering/pagination
router.get('/issues', compatibilityController.getIssues);

module.exports = router;
