const path = require('path');
const { KidsConfig, PlexServer, Movie, TVShow } = require('../models');
const PlexService = require('./plex.service');
const symlinkService = require('./symlink.service');

/**
 * Keeps the kids symlink farm in step with the 'kids' label in the main
 * Plex sections.
 *
 * Source of truth : the label, in Plex.
 * Durable mirror  : the symlink farm on disk.
 * Removal policy  : quarantine, never delete.
 */
class KidsSyncService {
  async getContext() {
    const config = await KidsConfig.getConfig();
    if (!config || !config.enabled) return null;
    if (!config.mappings.length) return null;

    const server = await PlexServer.getServer();
    if (!server) return null;

    return {
      config,
      server,
      plex: new PlexService(server.host, server.token)
    };
  }

  /**
   * Directories that must never be linked wholesale: the library roots.
   */
  async getSectionRoots(plex, sectionId) {
    const libraries = await plex.getLibraries();
    const section = libraries.find(lib => String(lib.key) === String(sectionId));
    if (!section || !section.Location) return [];
    return section.Location.map(loc => loc.path);
  }

  /**
   * The on-disk folder to link for a labelled item.
   *
   * Shows  : the show folder (Location).
   * Movies : the folder containing the file, so a Radarr quality upgrade
   *          replaces the file without touching the link.
   *
   * Returns null when no safe per-item folder can be determined — linking a
   * library root would drag the whole library onto the kids shelf.
   */
  async resolveSourceDir(plex, item, sectionType, sectionRoots) {
    let candidate = null;

    if (sectionType === 'show') {
      const metadata = item.Location ? item : await plex.getMetadata(item.ratingKey);
      candidate = metadata?.Location?.[0]?.path || null;
    } else {
      const filePath =
        item.Media?.[0]?.Part?.[0]?.file ||
        (await plex.getMetadata(item.ratingKey))?.Media?.[0]?.Part?.[0]?.file;
      candidate = filePath ? path.dirname(filePath) : null;
    }

    if (!candidate) return null;

    const normalized = path.normalize(candidate);
    const isRoot = sectionRoots.some(root => path.normalize(root) === normalized);
    if (isRoot) return null;

    return normalized;
  }

  /**
   * Links the farm should contain: { linkName -> sourceDir }.
   */
  async buildDesiredLinks(plex, config, mapping) {
    const sectionRoots = await this.getSectionRoots(plex, mapping.sourceSectionId);
    const items = await plex.getItemsByLabel(
      mapping.sourceSectionId,
      mapping.sourceType,
      config.label
    );

    const desired = {};
    const skipped = [];

    for (const item of items) {
      const sourceDir = await this.resolveSourceDir(plex, item, mapping.sourceType, sectionRoots);

      if (!sourceDir) {
        skipped.push({ title: item.title, reason: 'no per-item folder' });
        continue;
      }

      if (!(await symlinkService.targetExists(sourceDir))) {
        skipped.push({ title: item.title, reason: `missing on disk: ${sourceDir}` });
        continue;
      }

      desired[path.basename(sourceDir)] = sourceDir;
    }

    return { desired, skipped, itemCount: items.length };
  }

  /**
   * Reconcile one mapping.
   *
   * enforceLimit guards SCHEDULED runs only: a mass label loss should stop the
   * run, not empty the shelf. Deliberate removals made in the UI bypass it.
   */
  async reconcileMapping(plex, config, mapping, { dryRun = false, enforceLimit = true } = {}) {
    const { desired, skipped, itemCount } = await this.buildDesiredLinks(plex, config, mapping);
    const { links: existing, foreign } = await symlinkService.listFarm(mapping.farmPath);

    const toAdd = Object.keys(desired).filter(name => !(name in existing));
    const toQuarantine = Object.keys(existing).filter(name => !(name in desired));
    const broken = [];

    for (const [name, target] of Object.entries(existing)) {
      if (name in desired && !(await symlinkService.targetExists(target))) {
        broken.push({ name, target });
      }
    }

    const result = {
      section: mapping.kidsSectionId,
      type: mapping.sourceType,
      labelled: itemCount,
      linked: Object.keys(existing).length,
      added: 0,
      quarantined: 0,
      broken,
      skipped,
      foreign,
      aborted: false
    };

    if (enforceLimit && toQuarantine.length > config.maxRemovalsPerRun) {
      result.aborted = true;
      result.abortReason =
        `${toQuarantine.length} removals exceeds maxRemovalsPerRun ` +
        `(${config.maxRemovalsPerRun}); nothing changed. Check the ` +
        `'${config.label}' label is intact.`;
      console.warn(`[kids-sync] ${result.abortReason}`);
      return result;
    }

    if (dryRun) {
      result.wouldAdd = toAdd;
      result.wouldQuarantine = toQuarantine;
      return result;
    }

    for (const name of toAdd) {
      await symlinkService.createLink(mapping.farmPath, name, desired[name]);
      result.added += 1;
    }

    for (const name of toQuarantine) {
      await symlinkService.quarantineLink(mapping.farmPath, name, config.quarantinePath);
      result.quarantined += 1;
    }

    if (result.added || result.quarantined) {
      await plex.refreshSection(mapping.kidsSectionId);
    }

    return result;
  }

  /**
   * Reconcile every mapping. Called after each completed library sync and
   * from the Run now button.
   */
  async reconcileAll({ dryRun = false } = {}) {
    const context = await this.getContext();
    if (!context) return { skipped: true, reason: 'Kids sync not configured or disabled' };

    const { config, plex } = context;
    const results = [];

    for (const mapping of config.mappings) {
      try {
        results.push(await this.reconcileMapping(plex, config, mapping, { dryRun }));
      } catch (error) {
        console.error(`[kids-sync] ${mapping.sourceType} failed:`, error.message);
        results.push({ type: mapping.sourceType, error: error.message });
      }
    }

    await this.refreshKidsFlags(plex, config);

    const summary = { dryRun, results, at: new Date() };

    if (!dryRun) {
      config.lastRunAt = summary.at;
      config.lastRunSummary = summary;
      await config.save();
    }

    return summary;
  }

  /**
   * Refresh the cached isKids flag used by the movie/show lists.
   * The flag is a cache of the label, never a second source of truth.
   */
  async refreshKidsFlags(plex, config) {
    for (const mapping of config.mappings) {
      const Model = mapping.sourceType === 'show' ? TVShow : Movie;

      try {
        const items = await plex.getItemsByLabel(
          mapping.sourceSectionId,
          mapping.sourceType,
          config.label
        );
        const ids = items.map(item => String(item.ratingKey));

        await Model.updateMany(
          { libraryId: String(mapping.sourceSectionId), plexId: { $in: ids } },
          { $set: { isKids: true } }
        );
        await Model.updateMany(
          { libraryId: String(mapping.sourceSectionId), plexId: { $nin: ids } },
          { $set: { isKids: false } }
        );
      } catch (error) {
        console.error(`[kids-sync] flag refresh failed for ${mapping.sourceType}:`, error.message);
      }
    }
  }

  /**
   * Toggle the kids label on one item, then bring the farm into line
   * immediately so the shelf matches what the UI already shows.
   */
  async setKidsLabel(ratingKey, add) {
    const context = await this.getContext();
    if (!context) throw new Error('Kids sync is not configured or is disabled');

    const { config, plex } = context;
    const Model = await this.findModelFor(ratingKey);

    if (!Model) throw new Error(`No synced item found for ratingKey ${ratingKey}`);

    const { model, doc } = Model;
    const mapping = config.mappings.find(
      m => String(m.sourceSectionId) === String(doc.libraryId)
    );

    if (!mapping) {
      throw new Error(`Library ${doc.libraryId} has no kids mapping configured`);
    }

    await plex.setItemLabel(
      mapping.sourceSectionId,
      mapping.sourceType,
      ratingKey,
      config.label,
      add
    );

    await model.updateOne({ _id: doc._id }, { $set: { isKids: !!add } });

    // Deliberate single-item change: the removal guard does not apply.
    const result = await this.reconcileMapping(plex, config, mapping, { enforceLimit: false });

    return { ratingKey, isKids: !!add, reconcile: result };
  }

  /**
   * Locate a synced item by Plex ratingKey across movies and shows.
   */
  async findModelFor(ratingKey) {
    const plexId = String(ratingKey);

    const movie = await Movie.findOne({ plexId }).select('_id libraryId');
    if (movie) return { model: Movie, doc: movie };

    const show = await TVShow.findOne({ plexId }).select('_id libraryId');
    if (show) return { model: TVShow, doc: show };

    return null;
  }

  /**
   * Quarantined links for every configured farm.
   */
  async listQuarantine() {
    const config = await KidsConfig.getConfig();
    if (!config) return [];

    const buckets = [];
    for (const mapping of config.mappings) {
      buckets.push({
        type: mapping.sourceType,
        farmPath: mapping.farmPath,
        items: await symlinkService.listQuarantine(config.quarantinePath, mapping.farmPath)
      });
    }

    return buckets;
  }
}

module.exports = new KidsSyncService();
