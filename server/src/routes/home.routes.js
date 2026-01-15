const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home.controller');

// GET /api/home - Complete home page data
router.get('/', homeController.getHomeData);

// GET /api/home/streaming - Current streaming sessions
router.get('/streaming', homeController.getStreamingSessions);

// GET /api/home/downloads - Current download queue
router.get('/downloads', homeController.getDownloads);

// GET /api/home/stats - Quick stats
router.get('/stats', homeController.getStats);

// GET /api/home/activity - Paginated recent activity
router.get('/activity', homeController.getActivity);

module.exports = router;
