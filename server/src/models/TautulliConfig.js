const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/encryption');

const tautulliConfigSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
    trim: true
  },
  externalUrl: {
    type: String,
    trim: true,
    default: null
  },
  apiKey: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  serverName: {
    type: String,
    default: null
  },
  version: {
    type: String,
    default: null
  },
  // Sync settings
  syncEnabled: {
    type: Boolean,
    default: true
  },
  syncIntervalSeconds: {
    type: Number,
    default: 60
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  lastSyncSessionCount: {
    type: Number,
    default: 0
  },
  // Import tracking
  historyImported: {
    type: Boolean,
    default: false
  },
  historyImportedAt: {
    type: Date,
    default: null
  },
  totalSessionsImported: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Encrypt API key before saving
tautulliConfigSchema.pre('save', function(next) {
  if (this.isModified('apiKey') && this.apiKey && !this.apiKey.startsWith('enc:')) {
    this.apiKey = 'enc:' + encrypt(this.apiKey);
  }
  next();
});

// Decrypt API key when retrieving
tautulliConfigSchema.methods.getDecryptedApiKey = function() {
  if (this.apiKey && this.apiKey.startsWith('enc:')) {
    return decrypt(this.apiKey.substring(4));
  }
  return this.apiKey;
};

// Get config (singleton pattern)
tautulliConfigSchema.statics.getConfig = async function() {
  return await this.findOne();
};

// Save config (upsert)
tautulliConfigSchema.statics.saveConfig = async function(data) {
  let config = await this.findOne();
  if (config) {
    Object.assign(config, data);
    await config.save();
  } else {
    config = await this.create(data);
  }
  return config;
};

// Update sync status
tautulliConfigSchema.statics.updateSyncStatus = async function(sessionCount) {
  return await this.findOneAndUpdate(
    {},
    { 
      lastSyncAt: new Date(),
      lastSyncSessionCount: sessionCount,
      isConnected: true
    },
    { new: true }
  );
};

// Mark history as imported
tautulliConfigSchema.statics.markHistoryImported = async function(totalSessions) {
  return await this.findOneAndUpdate(
    {},
    {
      historyImported: true,
      historyImportedAt: new Date(),
      totalSessionsImported: totalSessions
    },
    { new: true }
  );
};

module.exports = mongoose.model('TautulliConfig', tautulliConfigSchema);
