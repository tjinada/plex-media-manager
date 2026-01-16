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

// GET /api/home/calendar - Combined calendar from Radarr/Sonarr
router.get('/calendar', homeController.getCalendar);

// GET /api/home/requests - Overseerr requests
router.get('/requests', homeController.getRequests);

// GET /api/home/shortcuts - Service shortcuts
router.get('/shortcuts', homeController.getShortcuts);

module.exports = router;
