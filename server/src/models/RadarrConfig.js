const mongoose = require('mongoose');

const radarrConfigSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
    trim: true
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
  version: {
    type: String,
    default: null
  },
  lastCheckedAt: {
    type: Date,
    default: null
  },
  maxMovieSize: {
    type: Number,
    default: 32212254720 // 30 GB in bytes
  }
}, {
  timestamps: true
});

// Ensure only one config exists
radarrConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  return config;
};

radarrConfigSchema.statics.saveConfig = async function(data) {
  let config = await this.findOne();
  if (config) {
    Object.assign(config, data);
    await config.save();
  } else {
    config = await this.create(data);
  }
  return config;
};

module.exports = mongoose.model('RadarrConfig', radarrConfigSchema);
