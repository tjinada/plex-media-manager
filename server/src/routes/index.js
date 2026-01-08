const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const serverRoutes = require('./server.routes');
const syncRoutes = require('./sync.routes');
const moviesRoutes = require('./movies.routes');
const showsRoutes = require('./shows.routes');

router.use('/auth', authRoutes);
router.use('/server', serverRoutes);
router.use('/sync', syncRoutes);
router.use('/movies', moviesRoutes);
router.use('/shows', showsRoutes);

module.exports = router;
