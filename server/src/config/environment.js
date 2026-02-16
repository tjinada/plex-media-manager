const crypto = require('crypto');

const environment = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/plex-media-manager',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-prod!',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  
  // Authentication
  auth: {
    username: process.env.AUTH_USERNAME || '',
    password: process.env.AUTH_PASSWORD || '',
    jwtSecret: process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || crypto.randomBytes(64).toString('hex'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
    get enabled() {
      return !!(environment.auth.username && environment.auth.password);
    }
  },

  // Plex API configuration
  plex: {
    clientIdentifier: process.env.PLEX_CLIENT_ID || 'tj-plex-media-manager',
    product: 'TJ Plex Media Manager',
    version: '1.0.0',
    platform: 'Web'
  }
};

module.exports = environment;
