const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  plexId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlexServer',
    required: true
  },
  showId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TVShow',
    required: true,
    index: true
  },
  
  // Basic Metadata
  title: String,
  seasonNumber: {
    type: Number,
    required: true
  },
  summary: String,
  
  // Artwork
  posterUrl: String,
  thumbUrl: String,
  
  // Stats
  episodeCount: {
    type: Number,
    default: 0
  },
  totalFileSize: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  addedAt: Date,
  updatedAt: Date,
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Compound unique index
seasonSchema.index({ plexId: 1, serverId: 1 }, { unique: true });
seasonSchema.index({ showId: 1, seasonNumber: 1 });

module.exports = mongoose.model('Season', seasonSchema);
