const express = require('express');
const router = express.Router();
const compatibilityController = require('../controllers/compatibility.controller');

// GET /api/compatibility/rules - Get all compatibility rules
router.get('/rules', compatibilityController.getRules);

// GET /api/compatibility/analysis - Get compatibility analysis summary
router.get('/analysis', compatibilityController.getAnalysis);

// GET /api/compatibility/issues - Get list of issues with filtering/pagination
router.get('/issues', compatibilityController.getIssues);

// GET /api/compatibility/search/movie/:movieId - Interactive search for movie via Radarr
router.get('/search/movie/:movieId', compatibilityController.searchMovie);

// GET /api/compatibility/search/episode/:episodeId - Interactive search for episode via Sonarr
router.get('/search/episode/:episodeId', compatibilityController.searchEpisode);

// POST /api/compatibility/download/movie - Download a movie release from Radarr
router.post('/download/movie', compatibilityController.downloadMovieRelease);

// POST /api/compatibility/download/episode - Download an episode release from Sonarr
router.post('/download/episode', compatibilityController.downloadEpisodeRelease);

// GET /api/compatibility/debug - Debug HDR info for a movie
router.get('/debug', compatibilityController.debugMovieHdr);

// GET /api/compatibility/cleanup - Find and optionally delete orphaned movies
router.get('/cleanup', compatibilityController.cleanupOrphans);

module.exports = router;
