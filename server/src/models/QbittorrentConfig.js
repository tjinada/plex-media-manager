const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/encryption');

const qbittorrentConfigSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: null
  },
  lastCheckedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Encrypt password before saving
qbittorrentConfigSchema.pre('save', function(next) {
  if (this.isModified('password') && this.password && !this.password.startsWith('enc:')) {
    this.password = 'enc:' + encrypt(this.password);
  }
  next();
});

// Decrypt password when retrieving
qbittorrentConfigSchema.methods.getDecryptedPassword = function() {
  if (this.password && this.password.startsWith('enc:')) {
    return decrypt(this.password.substring(4));
  }
  return this.password;
};

// Get config (singleton pattern)
qbittorrentConfigSchema.statics.getConfig = async function() {
  return await this.findOne();
};

// Save config (upsert)
qbittorrentConfigSchema.statics.saveConfig = async function(data) {
  let config = await this.findOne();
  if (config) {
    Object.assign(config, data);
    await config.save();
  } else {
    config = await this.create(data);
  }
  return config;
};

module.exports = mongoose.model('QbittorrentConfig', qbittorrentConfigSchema);
