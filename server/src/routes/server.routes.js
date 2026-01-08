const express = require('express');
const router = express.Router();
const serverController = require('../controllers/server.controller');

// GET /api/server - Get connected server
router.get('/', serverController.getServer);

// POST /api/server - Connect a server
router.post('/', serverController.connectServer);

// DELETE /api/server - Disconnect server
router.delete('/', serverController.disconnectServer);

// POST /api/server/test - Test connection
router.post('/test', serverController.testConnection);

// GET /api/server/image - Proxy Plex images
router.get('/image', serverController.proxyImage);

module.exports = router;
