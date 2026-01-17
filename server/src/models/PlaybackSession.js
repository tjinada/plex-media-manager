const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: String,
  platform: String,
  product: String,
  platformVersion: String,
  deviceIdentifier: String
}, { _id: false });

const playbackSchema = new mongoose.Schema({
  videoDecision: {
    type: String,
    enum: ['directplay', 'transcode', 'copy'],
    default: 'directplay'
  },
  audioDecision: {
    type: String,
    enum: ['directplay', 'transcode', 'copy'],
    default: 'directplay'
  },
  subtitleDecision: {
    type: String,
    enum: ['directplay', 'transcode', 'burn', 'none'],
    default: 'none'
  },
  containerDecision: {
    type: String,
    enum: ['directplay', 'transcode', 'copy'],
    default: 'directplay'
  },
  transcodeReason: String,
  
  // Hardware transcoding details (from Tautulli)
  transcodeHwRequested: { type: Boolean, default: false },
  transcodeHwDecoding: { type: Boolean, default: false },
  transcodeHwEncoding: { type: Boolean, default: false },
  transcodeHwFullPipeline: { type: Boolean, default: false },
  transcodeHwDecodeCodec: String,  // e.g., "hevc"
  transcodeHwEncodeCodec: String,  // e.g., "h264"
  transcodeHwDecodeTitle: String,  // e.g., "Intel QSV"
  transcodeHwEncodeTitle: String,
  
  // Transcode performance
  transcodeSpeed: Number,          // Speed multiplier
  transcodeProgress: Number,       // % complete at capture
  transcodeThrottled: { type: Boolean, default: false },
  
  protocol: String
}, { _id: false });

const mediaSnapshotSchema = new mongoose.Schema({
  videoCodec: String,
  audioCodec: String,
  resolution: String,
  container: String,
  bitrate: Number,
  videoBitrate: Number,
  audioBitrate: Number,
  audioChannels: Number,
  videoFramerate: String,
  aspectRatio: String,
  hdrType: String
}, { _id: false });

// Stream output - what was actually delivered after transcode
const streamOutputSchema = new mongoose.Schema({
  videoCodec: String,
  audioCodec: String,
  resolution: String,
  container: String,
  bitrate: Number,
  videoBitrate: Number,
  audioBitrate: Number,
  audioChannels: Number
}, { _id: false });

const bandwidthSchema = new mongoose.Schema({
  maxStreamingBitrate: Number,
  actualBitrate: Number
}, { _id: false });

const playbackSessionSchema = new mongoose.Schema({
  // Unique identifier from Plex
  sessionKey: {
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
  
  // Tautulli identifiers
  tautulliRowId: {
    type: Number,
    index: true,
    sparse: true
  },
  tautulliSessionKey: String,
  
  // What was played
  mediaType: {
    type: String,
    enum: ['movie', 'episode'],
    required: true
  },
  mediaItemId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'mediaType'
  },
  ratingKey: String,
  parentRatingKey: String,
  grandparentRatingKey: String,
  mediaTitle: String,
  
  // When
  viewedAt: {
    type: Date,
    required: true,
    index: true
  },
  startedAt: Date,
  stoppedAt: Date,
  duration: Number,
  watchedDuration: Number,    // How long actually watched
  pausedDuration: Number,     // Time spent paused
  percentComplete: Number,    // Watch progress percentage from Tautulli
  
  // Who
  userId: {
    type: String,
    index: true
  },
  userName: String,
  userThumb: String,
  
  // Device info
  device: deviceSchema,
  
  // Network info (from Tautulli)
  ipAddress: String,
  location: {
    type: String,
    enum: ['lan', 'wan'],
    default: 'lan'
  },
  secure: { type: Boolean, default: false },
  relayed: { type: Boolean, default: false },
  
  // Quality settings (from Tautulli)
  qualityProfile: String,           // e.g., "Original", "4 Mbps 720p"
  optimizedVersion: { type: Boolean, default: false },
  syncedVersion: { type: Boolean, default: false },
  
  // Transcode decisions
  playback: playbackSchema,
  
  // Media snapshot at time of playback (source)
  mediaSnapshot: mediaSnapshotSchema,
  
  // Stream output (what was delivered)
  streamOutput: streamOutputSchema,
  
  // Bandwidth info
  bandwidth: bandwidthSchema,
  
  // Data source tracking
  source: {
    type: String,
    enum: ['plex', 'tautulli', 'active'],
    default: 'plex'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Compound unique index to prevent duplicates
playbackSessionSchema.index({ sessionKey: 1, serverId: 1 }, { unique: true });

// Tautulli row ID index for deduplication during import
playbackSessionSchema.index({ tautulliRowId: 1, serverId: 1 }, { sparse: true });

// Indexes for efficient queries
playbackSessionSchema.index({ 'device.deviceIdentifier': 1 });
playbackSessionSchema.index({ 'device.platform': 1 });
playbackSessionSchema.index({ 'playback.videoDecision': 1 });
playbackSessionSchema.index({ 'playback.audioDecision': 1 });
playbackSessionSchema.index({ 'playback.transcodeHwDecoding': 1 });
playbackSessionSchema.index({ 'playback.transcodeHwEncoding': 1 });
playbackSessionSchema.index({ mediaItemId: 1 });
playbackSessionSchema.index({ serverId: 1, viewedAt: -1 });
playbackSessionSchema.index({ location: 1 });
playbackSessionSchema.index({ qualityProfile: 1 });

// TTL index for auto-purge after 12 months (365 days)
playbackSessionSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const PlaybackSession = mongoose.model('PlaybackSession', playbackSessionSchema);

module.exports = PlaybackSession;
