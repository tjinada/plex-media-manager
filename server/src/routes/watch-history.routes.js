const express = require('express');
const router = express.Router();
const watchHistoryController = require('../controllers/watch-history.controller');

// GET /api/watch-history/analysis - Get watch history analysis summary
router.get('/analysis', watchHistoryController.getAnalysis);

// GET /api/watch-history/movies - Get stale movies
router.get('/movies', watchHistoryController.getStaleMovies);

// GET /api/watch-history/episodes - Get stale episodes
router.get('/episodes', watchHistoryController.getStaleEpisodes);

// GET /api/watch-history/shows - Get stale shows (aggregated)
router.get('/shows', watchHistoryController.getStaleShows);

module.exports = router;
