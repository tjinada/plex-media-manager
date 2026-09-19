const mongoose = require('mongoose');

/**
 * One pair per media type. Movies and shows cannot share a Plex section,
 * so a full setup normally has two mappings.
 */
const mappingSchema = new mongoose.Schema({
  sourceSectionId: { type: String, required: true },
  sourceType: { type: String, enum: ['movie', 'show'], required: true },
  kidsSectionId: { type: String, required: true },
  // Absolute path as seen by BOTH this container and Plex (e.g. /media/kids-movies)
  farmPath: { type: String, required: true }
}, { _id: false });

const kidsConfigSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  label: { type: String, default: 'kids', trim: true },

  // Outside every library root, so the Plex scanner never sees quarantined links
  quarantinePath: { type: String, default: '/media/.kids-quarantine' },

  // Scheduled reconcile aborts if it would quarantine more than this many links.
  // Guards against a mass label loss (e.g. Kometa) emptying the kids library.
  maxRemovalsPerRun: { type: Number, default: 10, min: 1 },

  mappings: { type: [mappingSchema], default: [] },

  lastRunAt: { type: Date, default: null },
  lastRunSummary: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

// Single-document config, same pattern as PlexServer
kidsConfigSchema.statics.getConfig = async function () {
  return this.findOne();
};

kidsConfigSchema.statics.upsertConfig = async function (data) {
  const existing = await this.findOne();
  if (existing) {
    Object.assign(existing, data);
    return existing.save();
  }
  return this.create(data);
};

const KidsConfig = mongoose.model('KidsConfig', kidsConfigSchema);

module.exports = KidsConfig;
