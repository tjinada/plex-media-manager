const mongoose = require('mongoose');

const syncJobSchema = new mongoose.Schema({
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlexServer',
    required: true
  },
  
  type: {
    type: String,
    enum: ['full', 'incremental', 'movies', 'shows'],
    default: 'full'
  },
  
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Progress
  totalItems: {
    type: Number,
    default: 0
  },
  processedItems: {
    type: Number,
    default: 0
  },
  
  // Results
  moviesAdded: {
    type: Number,
    default: 0
  },
  moviesUpdated: {
    type: Number,
    default: 0
  },
  showsAdded: {
    type: Number,
    default: 0
  },
  showsUpdated: {
    type: Number,
    default: 0
  },
  episodesAdded: {
    type: Number,
    default: 0
  },
  episodesUpdated: {
    type: Number,
    default: 0
  },
  
  // Error Information
  error: String,
  
  // Timestamps
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Index for finding active jobs
syncJobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SyncJob', syncJobSchema);
