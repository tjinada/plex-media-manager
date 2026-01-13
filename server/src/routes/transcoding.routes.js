const express = require('express');
const router = express.Router();
const transcodingController = require('../controllers/transcoding.controller');

// GET /api/transcoding/summary - Overall stats
router.get('/summary', transcodingController.getSummary);

// GET /api/transcoding/decisions-over-time - Time series data
router.get('/decisions-over-time', transcodingController.getDecisionsOverTime);

// GET /api/transcoding/reasons - Transcode reasons breakdown
router.get('/reasons', transcodingController.getTranscodeReasons);

// GET /api/transcoding/by-device - Stats by device
router.get('/by-device', transcodingController.getByDevice);

// GET /api/transcoding/by-format - Stats by codec/container/HDR
router.get('/by-format', transcodingController.getByFormat);

// GET /api/transcoding/combinations - Problematic format combinations
router.get('/combinations', transcodingController.getCombinations);

// GET /api/transcoding/by-media - Top transcoding media items
router.get('/by-media', transcodingController.getByMedia);

// GET /api/transcoding/users - List of users for filter
router.get('/users', transcodingController.getUsers);

// GET /api/transcoding/recommendations - Smart recommendations
router.get('/recommendations', transcodingController.getRecommendations);

// GET /api/transcoding/sessions - Paginated session list
router.get('/sessions', transcodingController.getSessions);

module.exports = router;
