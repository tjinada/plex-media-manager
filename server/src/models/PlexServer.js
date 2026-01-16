const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/encryption');

const plexServerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
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
  externalUrl: {
    type: String,
    trim: true,
    default: null
  },
  token: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt
  },
  machineId: {
    type: String,
    default: null
  },
  version: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    default: null
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  autoSync: {
    enabled: {
      type: Boolean,
      default: false
    },
    intervalMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 1440
    }
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Ensure only one server exists (single server support)
plexServerSchema.statics.getServer = async function() {
  return this.findOne();
};

plexServerSchema.statics.upsertServer = async function(serverData) {
  const existing = await this.findOne();
  if (existing) {
    Object.assign(existing, serverData);
    return existing.save();
  }
  return this.create(serverData);
};

const PlexServer = mongoose.model('PlexServer', plexServerSchema);

module.exports = PlexServer;
