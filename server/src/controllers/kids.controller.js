const { KidsConfig, PlexServer } = require('../models');
const kidsSyncService = require('../services/kids-sync.service');

/**
 * Keep PlexServer.excludedLibraryIds in step with the configured kids
 * sections. Without this the next sync counts every labelled title twice in
 * stats, storage and compatibility.
 *
 * The list is derived, not merged: kids mappings are its only writer, so
 * changing a mapping cannot leave a stale section excluded.
 */
async function syncExcludedLibraries(config) {
  const server = await PlexServer.getServer();
  if (!server) return;

  server.excludedLibraryIds = [
    ...new Set((config.mappings || []).map(m => String(m.kidsSectionId)))
  ];

  await server.save();
}

/**
 * Current kids configuration and last run summary
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await KidsConfig.getConfig();

    if (!config) {
      return res.json({ configured: false, config: null });
    }

    res.json({ configured: true, config });
  } catch (error) {
    console.error('Error getting kids config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create or update the kids configuration
 */
exports.saveConfig = async (req, res) => {
  try {
    const { enabled, label, quarantinePath, maxRemovalsPerRun, mappings } = req.body;

    if (mappings && !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings must be an array' });
    }

    for (const mapping of mappings || []) {
      const missing = ['sourceSectionId', 'sourceType', 'kidsSectionId', 'farmPath']
        .filter(field => !mapping[field]);

      if (missing.length) {
        return res.status(400).json({
          error: `Mapping is missing required fields: ${missing.join(', ')}`
        });
      }
    }

    const config = await KidsConfig.upsertConfig({
      ...(enabled !== undefined && { enabled }),
      ...(label !== undefined && { label }),
      ...(quarantinePath !== undefined && { quarantinePath }),
      ...(maxRemovalsPerRun !== undefined && { maxRemovalsPerRun }),
      ...(mappings !== undefined && { mappings })
    });

    // Kids sections are projections of the main ones, so they must never be
    // synced in their own right. Derived here so it cannot be forgotten.
    await syncExcludedLibraries(config);

    res.json({ success: true, config });
  } catch (error) {
    console.error('Error saving kids config:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Run a reconcile now. Pass ?dryRun=true to see the plan without changing anything.
 */
exports.runReconcile = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === 'true';
    const summary = await kidsSyncService.reconcileAll({ dryRun });
    res.json(summary);
  } catch (error) {
    console.error('Error running kids reconcile:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add or remove the kids label on a single item, then reconcile it
 */
exports.setItemLabel = async (req, res) => {
  try {
    const { ratingKey } = req.params;
    const { isKids } = req.body;

    if (typeof isKids !== 'boolean') {
      return res.status(400).json({ error: 'isKids must be a boolean' });
    }

    const result = await kidsSyncService.setKidsLabel(ratingKey, isKids);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error setting kids label:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * List quarantined links awaiting review
 */
exports.getQuarantine = async (req, res) => {
  try {
    const buckets = await kidsSyncService.listQuarantine();
    res.json(buckets);
  } catch (error) {
    console.error('Error listing kids quarantine:', error);
    res.status(500).json({ error: error.message });
  }
};
