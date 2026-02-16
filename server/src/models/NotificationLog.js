const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['streaming_started', 'compatibility_issue', 'media_downloaded', 'missing_media']
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  url: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  recipientCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  }
});

// Auto-expire old logs after 30 days
notificationLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
