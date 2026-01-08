const express = require('express');
const router = express.Router();
const moviesController = require('../controllers/movies.controller');

// GET /api/movies - Get all movies
router.get('/', moviesController.getMovies);

// GET /api/movies/:id - Get movie by ID
router.get('/:id', moviesController.getMovie);

module.exports = router;
