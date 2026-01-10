const express = require('express');
const router = express.Router();
const watchHistoryController = require('../controllers/watch-history.controller');

// GET /api/watch-history/analysis - Get watch history analysis summary
router.get('/analysis', watchHistoryController.getAnalysis);

// GET /api/watch-history/movies - Get movies with watch status
router.get('/movies', watchHistoryController.getMovies);

// GET /api/watch-history/episodes - Get episodes with watch status
router.get('/episodes', watchHistoryController.getEpisodes);

// GET /api/watch-history/shows - Get TV shows with watch status aggregation
router.get('/shows', watchHistoryController.getShows);

module.exports = router;
