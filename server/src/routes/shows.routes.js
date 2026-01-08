const express = require('express');
const router = express.Router();
const showsController = require('../controllers/shows.controller');

// GET /api/shows - Get all shows
router.get('/', showsController.getShows);

// GET /api/shows/:id - Get show by ID
router.get('/:id', showsController.getShow);

// GET /api/shows/:showId/seasons/:seasonNumber - Get season with episodes
router.get('/:showId/seasons/:seasonNumber', showsController.getSeason);

// GET /api/episodes/:id - Get episode by ID
router.get('/episodes/:id', showsController.getEpisode);

module.exports = router;
