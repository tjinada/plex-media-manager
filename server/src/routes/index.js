const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

const authRoutes = require('./auth.routes');
const serverRoutes = require('./server.routes');
const syncRoutes = require('./sync.routes');
const moviesRoutes = require('./movies.routes');
const showsRoutes = require('./shows.routes');
const episodesRoutes = require('./episodes.routes');
const statsRoutes = require('./stats.routes');
const radarrRoutes = require('./radarr.routes');
const sonarrRoutes = require('./sonarr.routes');
const watchHistoryRoutes = require('./watch-history.routes');
const compatibilityRoutes = require('./compatibility.routes');
const transcodingRoutes = require('./transcoding.routes');
const tautulliRoutes = require('./tautulli.routes');
const homeRoutes = require('./home.routes');
const nzbgetRoutes = require('./nzbget.routes');
const qbittorrentRoutes = require('./qbittorrent.routes');
const overseerrRoutes = require('./overseerr.routes');
const notificationRoutes = require('./notification.routes');

// Public routes — no auth required
router.use('/auth', authRoutes);

// Protected routes — auth middleware applied
router.use(authMiddleware);

router.use('/server', serverRoutes);
router.use('/sync', syncRoutes);
router.use('/movies', moviesRoutes);
router.use('/shows', showsRoutes);
router.use('/episodes', episodesRoutes);
router.use('/stats', statsRoutes);
router.use('/radarr', radarrRoutes);
router.use('/sonarr', sonarrRoutes);
router.use('/watch-history', watchHistoryRoutes);
router.use('/compatibility', compatibilityRoutes);
router.use('/transcoding', transcodingRoutes);
router.use('/tautulli', tautulliRoutes);
router.use('/home', homeRoutes);
router.use('/nzbget', nzbgetRoutes);
router.use('/qbittorrent', qbittorrentRoutes);
router.use('/overseerr', overseerrRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
