const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  // Master toggle
  enabled: {
    type: Boolean,
    default: true
  },
  // Per-category toggles
  categories: {
    streaming_started: {
      enabled: { type: Boolean, default: true }
    },
    compatibility_issue: {
      enabled: { type: Boolean, default: true },
      minSeverity: { type: String, enum: ['critical', 'medium', 'all'], default: 'critical' }
    },
    media_downloaded: {
      enabled: { type: Boolean, default: true }
    },
    missing_media: {
      enabled: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Singleton pattern — only one preferences doc
notificationPreferenceSchema.statics.getPreferences = async function () {
  let prefs = await this.findOne();
  if (!prefs) {
    prefs = await this.create({});
  }
  return prefs;
};

notificationPreferenceSchema.statics.savePreferences = async function (data) {
  let prefs = await this.findOne();
  if (prefs) {
    Object.assign(prefs, data);
    await prefs.save();
  } else {
    prefs = await this.create(data);
  }
  return prefs;
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
