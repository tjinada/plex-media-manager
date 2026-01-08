const mongoose = require('mongoose');

const audioTrackSchema = new mongoose.Schema({
  codec: String,
  channels: Number,
  language: String,
  title: String
}, { _id: false });

const subtitleSchema = new mongoose.Schema({
  language: String,
  codec: String,
  forced: { type: Boolean, default: false },
  title: String
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  // Video
  videoCodec: String,
  videoProfile: String,
  videoBitrate: Number,
  videoFrameRate: String,
  
  // Resolution
  width: Number,
  height: Number,
  resolution: String,
  aspectRatio: String,
  
  // Audio (primary track)
  audioCodec: String,
  audioProfile: String,
  audioChannels: Number,
  audioBitrate: Number,
  
  // Container & File
  container: String,
  fileSize: Number,
  filePath: String,
  fileName: String,
  duration: Number,
  bitrate: Number,
  
  // Additional tracks
  audioTracks: [audioTrackSchema],
  subtitles: [subtitleSchema]
}, { _id: false });

const movieSchema = new mongoose.Schema({
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
  audienceRating: Number,
  studio: String,
  
  // Media Identifiers
  guid: String,
  imdbId: String,
  tmdbId: String,
  
  // Artwork
  posterUrl: String,
  artUrl: String,
  thumbUrl: String,
  
  // Genres & Tags
  genres: [String],
  directors: [String],
  writers: [String],
  actors: [{
    name: String,
    role: String,
    thumb: String
  }],
  
  // Media File Information
  media: mediaSchema,
  
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
movieSchema.index({ plexId: 1, serverId: 1 }, { unique: true });

// Text index for search
movieSchema.index({ title: 'text', originalTitle: 'text' });

// Indexes for filtering
movieSchema.index({ 'media.resolution': 1 });
movieSchema.index({ 'media.videoCodec': 1 });
movieSchema.index({ 'media.fileSize': 1 });
movieSchema.index({ year: 1 });

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
