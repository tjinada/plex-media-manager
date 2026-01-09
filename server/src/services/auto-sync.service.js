const cron = require('node-cron');
const { PlexServer } = require('../models');
const SyncService = require('./sync.service');

class AutoSyncService {
  constructor() {
    this.scheduledTask = null;
    this.nextRunAt = null;
  }

  /**
   * Initialize auto-sync on server startup
   */
  async initialize() {
    try {
      const server = await PlexServer.getServer();
      if (server && server.autoSync?.enabled) {
        console.log(`Auto-sync enabled with ${server.autoSync.intervalMinutes} minute interval`);
        this.scheduleSync(server.autoSync.intervalMinutes);
      } else {
        console.log('Auto-sync is disabled');
      }
    } catch (error) {
      console.error('Failed to initialize auto-sync:', error.message);
    }
  }

  /**
   * Schedule sync at specified interval
   */
  scheduleSync(intervalMinutes) {
    // Cancel existing task if any
    this.stop();

    // Calculate cron expression based on interval
    const cronExpression = this.getCronExpression(intervalMinutes);
    
    console.log(`Scheduling auto-sync with cron: ${cronExpression}`);

    this.scheduledTask = cron.schedule(cronExpression, async () => {
      await this.runScheduledSync();
    });

    // Calculate next run time
    this.calculateNextRunTime(intervalMinutes);
  }

  /**
   * Convert interval minutes to cron expression
   */
  getCronExpression(intervalMinutes) {
    if (intervalMinutes < 60) {
      // Run every N minutes
      return `*/${intervalMinutes} * * * *`;
    } else if (intervalMinutes < 1440) {
      // Run every N hours
      const hours = Math.floor(intervalMinutes / 60);
      return `0 */${hours} * * *`;
    } else {
      // Run once a day at midnight
      return '0 0 * * *';
    }
  }

  /**
   * Calculate the next scheduled run time
   */
  calculateNextRunTime(intervalMinutes) {
    const now = new Date();
    const nextRun = new Date(now);
    
    if (intervalMinutes < 60) {
      // Next interval minute mark
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil((currentMinute + 1) / intervalMinutes) * intervalMinutes;
      if (nextMinute >= 60) {
        nextRun.setHours(nextRun.getHours() + 1);
        nextRun.setMinutes(nextMinute - 60);
      } else {
        nextRun.setMinutes(nextMinute);
      }
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
    } else if (intervalMinutes < 1440) {
      // Next hour mark
      const hours = Math.floor(intervalMinutes / 60);
      const currentHour = now.getHours();
      const nextHour = Math.ceil((currentHour + 1) / hours) * hours;
      if (nextHour >= 24) {
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(nextHour - 24);
      } else {
        nextRun.setHours(nextHour);
      }
      nextRun.setMinutes(0);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
    } else {
      // Next midnight
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    }

    this.nextRunAt = nextRun;
  }

  /**
   * Run the scheduled sync
   */
  async runScheduledSync() {
    console.log(`[${new Date().toISOString()}] Auto-sync triggered`);

    // Check if sync is already running
    if (SyncService.isRunning()) {
      console.log('Sync already in progress, skipping scheduled sync');
      return;
    }

    // Check if server is still configured and auto-sync is enabled
    const server = await PlexServer.getServer();
    if (!server) {
      console.log('No server configured, skipping auto-sync');
      return;
    }

    if (!server.autoSync?.enabled) {
      console.log('Auto-sync has been disabled, stopping scheduler');
      this.stop();
      return;
    }

    try {
      const syncService = new SyncService();
      await syncService.startSync('full');
      console.log('Auto-sync started successfully');
      
      // Recalculate next run time
      this.calculateNextRunTime(server.autoSync.intervalMinutes);
    } catch (error) {
      console.error('Auto-sync failed to start:', error.message);
    }
  }

  /**
   * Update auto-sync settings and reschedule
   */
  async updateSettings(enabled, intervalMinutes) {
    const server = await PlexServer.getServer();
    if (!server) {
      throw new Error('No Plex server configured');
    }

    // Validate interval
    if (intervalMinutes < 5 || intervalMinutes > 1440) {
      throw new Error('Interval must be between 5 and 1440 minutes');
    }

    // Update server settings
    server.autoSync = {
      enabled,
      intervalMinutes
    };
    await server.save();

    // Update schedule
    if (enabled) {
      this.scheduleSync(intervalMinutes);
      console.log(`Auto-sync enabled: every ${intervalMinutes} minutes`);
    } else {
      this.stop();
      console.log('Auto-sync disabled');
    }

    return this.getSettings();
  }

  /**
   * Get current auto-sync settings
   */
  async getSettings() {
    const server = await PlexServer.getServer();
    
    if (!server) {
      return {
        enabled: false,
        intervalMinutes: 15,
        nextRunAt: null,
        serverConfigured: false
      };
    }

    return {
      enabled: server.autoSync?.enabled || false,
      intervalMinutes: server.autoSync?.intervalMinutes || 15,
      nextRunAt: server.autoSync?.enabled ? this.nextRunAt : null,
      serverConfigured: true
    };
  }

  /**
   * Stop the scheduled task
   */
  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      this.nextRunAt = null;
      console.log('Auto-sync scheduler stopped');
    }
  }
}

// Singleton instance
const autoSyncService = new AutoSyncService();

module.exports = autoSyncService;
