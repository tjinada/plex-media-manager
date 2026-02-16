const jwt = require('jsonwebtoken');
const environment = require('../config/environment');

/**
 * Authentication middleware
 * - If AUTH_USERNAME and AUTH_PASSWORD are not set, auth is disabled (passthrough)
 * - Validates JWT from Authorization header OR ?token= query param (for images/ws)
 */
const authMiddleware = (req, res, next) => {
  // Auth disabled — passthrough
  if (!environment.auth.enabled) {
    return next();
  }

  // Try Authorization header first
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Fallback to query param (for <img src>, WebSocket, etc.)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const decoded = jwt.verify(token, environment.auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Session expired, please log in again' }
      });
    }
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' }
    });
  }
};

/**
 * Generate a JWT for the authenticated user
 */
const generateToken = (username) => {
  return jwt.sign(
    { username, iat: Math.floor(Date.now() / 1000) },
    environment.auth.jwtSecret,
    { expiresIn: environment.auth.jwtExpiresIn }
  );
};

module.exports = { authMiddleware, generateToken };
