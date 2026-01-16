const axios = require('axios');
const { PlexServer } = require('../models');
const PlexService = require('../services/plex.service');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Get connected Plex server
 */
exports.getServer = async (req, res, next) => {
  try {
    const server = await PlexServer.getServer();

    if (!server) {
      return res.json({ server: null });
    }

    res.json({
      server: {
        id: server._id,
        name: server.name,
        host: server.host,
        externalUrl: server.externalUrl || null,
        version: server.version,
        platform: server.platform,
        isConnected: server.isConnected,
        lastSyncAt: server.lastSyncAt
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Connect a Plex server
 */
exports.connectServer = async (req, res, next) => {
  try {
    const { host, token, externalUrl } = req.body;

    if (!host || !token) {
      throw new ApiError(400, 'Host and token are required', 'VALIDATION_ERROR');
    }

    // Test connection first
    const plexService = new PlexService(host, token);
    const serverInfo = await plexService.testConnection();

    // Save server configuration
    const server = await PlexServer.upsertServer({
      name: serverInfo.name,
      host: host.replace(/\/$/, ''), // Remove trailing slash
      externalUrl: externalUrl ? externalUrl.replace(/\/$/, '') : null,
      token,
      machineId: serverInfo.machineId,
      version: serverInfo.version,
      platform: serverInfo.platform,
      isConnected: true
    });

    res.status(201).json({
      success: true,
      server: {
        id: server._id,
        name: server.name,
        host: server.host,
        externalUrl: server.externalUrl || null,
        version: server.version,
        platform: server.platform,
        isConnected: server.isConnected
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Disconnect Plex server
 */
exports.disconnectServer = async (req, res, next) => {
  try {
    await PlexServer.deleteMany({});

    res.json({ success: true });

  } catch (error) {
    next(error);
  }
};

/**
 * Update Plex server external URL
 */
exports.updateExternalUrl = async (req, res, next) => {
  try {
    const { externalUrl } = req.body;

    const server = await PlexServer.getServer();

    if (!server) {
      throw new ApiError(404, 'No Plex server configured', 'NOT_FOUND');
    }

    server.externalUrl = externalUrl ? externalUrl.replace(/\/$/, '') : null;
    await server.save();

    res.json({
      server: {
        id: server._id,
        name: server.name,
        host: server.host,
        externalUrl: server.externalUrl || null,
        version: server.version,
        platform: server.platform,
        isConnected: server.isConnected,
        lastSyncAt: server.lastSyncAt
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Test connection to Plex server (with host/token in body for pre-connect testing)
 */
exports.testConnection = async (req, res, next) => {
  try {
    const { host, token } = req.body;
    
    // If host and token provided, test those (pre-connect test)
    if (host && token) {
      const plexService = new PlexService(host, token);
      const serverInfo = await plexService.testConnection();
      
      return res.json({
        success: true,
        name: serverInfo.name,
        version: serverInfo.version
      });
    }
    
    // Otherwise test the saved server
    const server = await PlexServer.getServer();

    if (!server) {
      throw new ApiError(404, 'No Plex server configured', 'NOT_FOUND');
    }

    const plexService = new PlexService(server.host, server.token);
    const serverInfo = await plexService.testConnection();

    // Update connection status
    await PlexServer.updateOne(
      { _id: server._id },
      { isConnected: true, version: serverInfo.version }
    );

    res.json({
      success: true,
      name: serverInfo.name,
      version: serverInfo.version
    });

  } catch (error) {
    // Update connection status to false on failure if testing saved server
    if (!req.body.host) {
      const server = await PlexServer.getServer();
      if (server) {
        await PlexServer.updateOne(
          { _id: server._id },
          { isConnected: false }
        );
      }
    }
    next(error);
  }
};

/**
 * Proxy Plex images to avoid exposing token to client
 */
exports.proxyImage = async (req, res, next) => {
  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const server = await PlexServer.getServer();

    if (!server) {
      return res.status(404).json({ error: 'No Plex server configured' });
    }

    const imageUrl = `${server.host}${path}?X-Plex-Token=${server.token}`;

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(response.data);

  } catch (error) {
    // Return a 1x1 transparent pixel on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.send(pixel);
  }
};
