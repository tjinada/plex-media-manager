const crypto = require('crypto');
const environment = require('../config/environment');
const { generateToken } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

// Rate limiting state — in-memory, per IP
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function checkRateLimit(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return true;

  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    loginAttempts.delete(ip);
    return true;
  }

  if (record.lockedUntil && Date.now() <= record.lockedUntil) {
    return false;
  }

  return record.attempts < MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const record = loginAttempts.get(ip) || { attempts: 0, lockedUntil: null };
  record.attempts++;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + (LOCKOUT_MINUTES * 60 * 1000);
    console.warn(`Login lockout: ${ip} locked for ${LOCKOUT_MINUTES} minutes after ${MAX_ATTEMPTS} failed attempts`);
  }

  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Constant-time string comparison using HMAC to prevent timing attacks.
 * Unlike timingSafeEqual, this doesn't leak length information.
 */
function safeCompare(a, b) {
  const key = crypto.randomBytes(32);
  const hmacA = crypto.createHmac('sha256', key).update(String(a)).digest();
  const hmacB = crypto.createHmac('sha256', key).update(String(b)).digest();
  return crypto.timingSafeEqual(hmacA, hmacB);
}

/**
 * GET /api/auth/status
 * Returns whether auth is enabled and if current request is authenticated
 */
exports.getStatus = (req, res) => {
  const authEnabled = environment.auth.enabled;

  // No-cache headers — never cache auth status
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache'
  });

  if (!authEnabled) {
    return res.json({ authEnabled: false, authenticated: true });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authEnabled: true, authenticated: false });
  }

  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(authHeader.substring(7), environment.auth.jwtSecret);
    return res.json({ authEnabled: true, authenticated: true });
  } catch {
    return res.json({ authEnabled: true, authenticated: false });
  }
};

/**
 * POST /api/auth/login
 * Validates credentials and returns a JWT
 */
exports.login = async (req, res, next) => {
  try {
    if (!environment.auth.enabled) {
      throw new ApiError(400, 'Authentication is not configured');
    }

    const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      // Add delay to slow down automated attacks even further
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many login attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
        }
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      throw new ApiError(400, 'Username and password are required');
    }

    // Constant-time comparison for both fields (HMAC-based, no length leak)
    const usernameMatch = safeCompare(username, environment.auth.username);
    const passwordMatch = safeCompare(password, environment.auth.password);

    if (!usernameMatch || !passwordMatch) {
      recordFailedAttempt(clientIp);
      // Small delay on failed login to slow brute force
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }
      });
    }

    // Success
    clearAttempts(clientIp);
    const token = generateToken(username);

    console.log(`Successful login from ${clientIp}`);

    res.json({
      success: true,
      token,
      expiresIn: environment.auth.jwtExpiresIn
    });
  } catch (error) {
    next(error);
  }
};

// Clean up stale rate limit records every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (record.lockedUntil && now > record.lockedUntil) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);
