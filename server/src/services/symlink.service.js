const fs = require('fs/promises');
const path = require('path');

/**
 * Filesystem operations for the kids symlink farm.
 *
 * Knows nothing about Plex. Every link it creates is RELATIVE, so the same
 * link resolves correctly in this container and in the Plex container as long
 * as both mount the media root at the same path.
 */
class SymlinkService {
  /**
   * Existing links in a farm directory: { name -> resolved target }.
   * Non-symlink entries are reported so they are never touched.
   */
  async listFarm(farmDir) {
    const links = {};
    const foreign = [];

    let entries;
    try {
      entries = await fs.readdir(farmDir, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return { links, foreign };
      throw error;
    }

    for (const entry of entries) {
      const full = path.join(farmDir, entry.name);
      if (entry.isSymbolicLink()) {
        links[entry.name] = path.resolve(farmDir, await fs.readlink(full));
      } else {
        foreign.push(entry.name);
      }
    }

    return { links, foreign };
  }

  /**
   * Create a relative symlink at <farmDir>/<name> pointing to targetPath.
   * Returns the relative target that was written.
   */
  async createLink(farmDir, name, targetPath) {
    await fs.mkdir(farmDir, { recursive: true });
    const linkPath = path.join(farmDir, name);
    const relativeTarget = path.relative(farmDir, targetPath);
    await fs.symlink(relativeTarget, linkPath);
    return relativeTarget;
  }

  /**
   * Move a link out of the farm into quarantine instead of deleting it.
   * Timestamped so repeated quarantines of the same title never collide.
   */
  async quarantineLink(farmDir, name, quarantineRoot) {
    const bucket = path.join(quarantineRoot, path.basename(farmDir));
    await fs.mkdir(bucket, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(bucket, `${name}__${stamp}`);

    await fs.rename(path.join(farmDir, name), destination);
    return destination;
  }

  /**
   * List quarantined links for a farm, newest first.
   */
  async listQuarantine(quarantineRoot, farmDir) {
    const bucket = path.join(quarantineRoot, path.basename(farmDir));

    let names;
    try {
      names = await fs.readdir(bucket);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }

    return names
      .map(name => ({ name, fullPath: path.join(bucket, name) }))
      .sort((a, b) => b.name.localeCompare(a.name));
  }

  /**
   * True when the path exists (following symlinks).
   * Used to spot links whose target the arrs have moved or removed.
   */
  async targetExists(targetPath) {
    try {
      await fs.stat(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new SymlinkService();
