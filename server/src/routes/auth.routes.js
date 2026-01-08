const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// POST /api/auth/plex/token - Validate Plex token
router.post('/plex/token', authController.validateToken);

module.exports = router;
