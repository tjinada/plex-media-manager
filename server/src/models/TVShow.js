const mongoose = require('mongoose');

const tvShowSchema = new mongoose.Schema({
  plexId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlexServer',
    required: true,
    index: true
  },
  
  // Basic Metadata
  title: {
    type: String,
    required: true
  },
  originalTitle: String,
  year: Number,
  summary: String,
  tagline: String,
  contentRating: String,
  rating: Number,
  studio: String,
  
  // Media Identifiers
  guid: String,
  imdbId: String,
  tmdbId: String,
  tvdbId: String,
  
  // Artwork
  posterUrl: String,
  artUrl: String,
  thumbUrl: String,
  bannerUrl: String,
  
  // Genres & Tags
  genres: [String],
  actors: [{
    name: String,
    role: String,
    thumb: String
  }],
  
  // Stats (computed from episodes)
  seasonCount: {
    type: Number,
    default: 0
  },
  episodeCount: {
    type: Number,
    default: 0
  },
  totalFileSize: {
    type: Number,
    default: 0
  },
  
  // Aggregate Media Info (most common across episodes)
  dominantResolution: String,
  dominantVideoCodec: String,
  
  // Library Info
  libraryId: String,
  libraryName: String,
  
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
tvShowSchema.index({ plexId: 1, serverId: 1 }, { unique: true });

// Text index for search
tvShowSchema.index({ title: 'text', originalTitle: 'text' });

// Indexes for filtering
tvShowSchema.index({ dominantResolution: 1 });
tvShowSchema.index({ dominantVideoCodec: 1 });

const TVShow = mongoose.model('TVShow', tvShowSchema);

module.exports = TVShow;
