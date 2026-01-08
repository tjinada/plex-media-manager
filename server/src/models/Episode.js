const mongoose = require('mongoose');

const audioTrackSchema = new mongoose.Schema({
  codec: String,
  channels: Number,
  language: String,
  title: String,
  bitrate: Number,
  profile: String,
  extendedDisplayTitle: String
}, { _id: false });

const subtitleSchema = new mongoose.Schema({
  language: String,
  codec: String,
  forced: Boolean,
  title: String
}, { _id: false });

const hdrSchema = new mongoose.Schema({
  // Dolby Vision
  doviPresent: { type: Boolean, default: false },
  doviProfile: Number,
  doviLevel: Number,
  doviVersion: String,
  doviBLPresent: { type: Boolean, default: false },
  doviELPresent: { type: Boolean, default: false },
  doviRPUPresent: { type: Boolean, default: false },
  doviBLCompatID: Number,
  // HDR10/HDR10+
  colorPrimaries: String,
  colorTransfer: String,
  colorSpace: String,
  // Bit depth
  bitDepth: Number,
  // Display titles
  displayTitle: String,
  extendedDisplayTitle: String
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
  subtitles: [subtitleSchema],
  
  // HDR/Dolby Vision info
  hdr: hdrSchema
}, { _id: false });

const episodeSchema = new mongoose.Schema({
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
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
    index: true
  },
  
  // Basic Metadata
  title: String,
  seasonNumber: Number,
  episodeNumber: Number,
  summary: String,
  contentRating: String,
  rating: Number,
  
  // Media Identifiers
  guid: String,
  imdbId: String,
  tmdbId: String,
  tvdbId: String,
  
  // Artwork
  thumbUrl: String,
  
  // Directors & Writers
  directors: [String],
  writers: [String],
  
  // Media File Information
  media: mediaSchema,
  
  // Library Info
  libraryId: String,
  libraryName: String,
  
  // Watch History (aggregated across all users)
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date,
    default: null
  },
  
  // Timestamps
  originallyAiredAt: Date,
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
episodeSchema.index({ plexId: 1, serverId: 1 }, { unique: true });
episodeSchema.index({ showId: 1, seasonNumber: 1, episodeNumber: 1 });

// Indexes for filtering
episodeSchema.index({ 'media.resolution': 1 });
episodeSchema.index({ 'media.videoCodec': 1 });

// Indexes for watch history
episodeSchema.index({ viewCount: 1 });
episodeSchema.index({ lastViewedAt: 1 });

// Indexes for compatibility checks
episodeSchema.index({ 'media.hdr.doviPresent': 1 });
episodeSchema.index({ 'media.hdr.doviProfile': 1 });

module.exports = mongoose.model('Episode', episodeSchema);
