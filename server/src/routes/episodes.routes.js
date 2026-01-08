const express = require('express');
const router = express.Router();
const episodesController = require('../controllers/episodes.controller');

// GET /api/episodes - Get all episodes with filtering
router.get('/', episodesController.getEpisodes);

// GET /api/episodes/:id - Get episode by ID
router.get('/:id', episodesController.getEpisode);

module.exports = router;
