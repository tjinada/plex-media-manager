const jwt = require('jsonwebtoken');
const environment = require('../config/environment');

/**
 * Authentication middleware
 * - If AUTH_USERNAME and AUTH_PASSWORD are not set, auth is disabled (passthrough)
 * - Otherwise, validates JWT from Authorization header
 */
const authMiddleware = (req, res, next) => {
  // Auth disabled — passthrough
  if (!environment.auth.enabled) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const token = authHeader.substring(7);

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
