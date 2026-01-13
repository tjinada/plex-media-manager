const { TautulliConfig, PlaybackSession, PlexServer } = require('../models');
const TautulliService = require('./tautulli.service');

/**
 * Service for syncing playback history from Tautulli
 */
class TautulliSyncService {
  constructor() {
    this.isImporting = false;
    this.importCancelled = false;
    this.importProgress = {
      status: 'idle',
      totalRecords: 0,
      processedRecords: 0,
      importedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      progress: 0,
      error: null,
      startedAt: null,
      completedAt: null
    };
    
    // Real-time sync
    this.syncIntervalId = null;
    this.isSyncing = false;
  }

  /**
   * Get current import status
   */
  getImportStatus() {
    return {
      isImporting: this.isImporting,
      ...this.importProgress
    };
  }

  /**
   * Start historical import from Tautulli
   */
  async startHistoricalImport() {
    if (this.isImporting) {
      throw new Error('Import already in progress');
    }

    const config = await TautulliConfig.getConfig();
    if (!config) {
      throw new Error('Tautulli not configured');
    }

    const server = await PlexServer.getServer();
    if (!server) {
      throw new Error('Plex server not configured');
    }

    this.isImporting = true;
    this.importCancelled = false;
    this.importProgress = {
      status: 'starting',
      totalRecords: 0,
      processedRecords: 0,
      importedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      progress: 0,
      error: null,
      startedAt: new Date(),
      completedAt: null
    };

    // Run import in background
    this.runImport(config, server._id).catch(error => {
      console.error('Import failed:', error);
      this.importProgress.status = 'failed';
      this.importProgress.error = error.message;
      this.isImporting = false;
    });

    return { success: true, message: 'Import started' };
  }

  /**
   * Cancel running import
   */
  cancelImport() {
    if (!this.isImporting) {
      return { success: false, message: 'No import in progress' };
    }
    
    this.importCancelled = true;
    this.importProgress.status = 'cancelling';
    return { success: true, message: 'Import cancellation requested' };
  }

  /**
   * Run the actual import process
   */
  async runImport(config, serverId) {
    const tautulli = new TautulliService(config.host, config.getDecryptedApiKey());
    const batchSize = 100;
    let start = 0;

    try {
      // Get total count
      const initialData = await tautulli.getHistory({ length: 1 });
      this.importProgress.totalRecords = initialData.totalRecords;
      this.importProgress.status = 'importing';

      console.log(`Starting Tautulli import: ${this.importProgress.totalRecords} total records`);

      while (start < this.importProgress.totalRecords && !this.importCancelled) {
        // Fetch batch
        const historyData = await tautulli.getHistory({
          start,
          length: batchSize,
          orderColumn: 'date',
          orderDir: 'desc'
        });

        const sessions = historyData.sessions || [];
        
        for (const record of sessions) {
          if (this.importCancelled) break;

          try {
            await this.importSession(record, tautulli, serverId);
            this.importProgress.importedRecords++;
          } catch (error) {
            if (error.code === 11000) {
              // Duplicate - already exists
              this.importProgress.skippedRecords++;
            } else {
              this.importProgress.errorRecords++;
              console.error(`Error importing session ${record.id}:`, error.message);
            }
          }

          this.importProgress.processedRecords++;
          this.importProgress.progress = Math.round(
            (this.importProgress.processedRecords / this.importProgress.totalRecords) * 100
          );
        }

        start += batchSize;

        // Small delay to avoid overwhelming Tautulli
        await this.sleep(100);
      }

      if (this.importCancelled) {
        this.importProgress.status = 'cancelled';
        console.log('Import cancelled by user');
      } else {
        this.importProgress.status = 'completed';
        this.importProgress.completedAt = new Date();
        
        // Mark history as imported in config
        await TautulliConfig.markHistoryImported(this.importProgress.importedRecords);
        
        console.log(`Import completed: ${this.importProgress.importedRecords} imported, ${this.importProgress.skippedRecords} skipped, ${this.importProgress.errorRecords} errors`);
      }
    } catch (error) {
      this.importProgress.status = 'failed';
      this.importProgress.error = error.message;
      throw error;
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Import a single session from Tautulli
   */
  async importSession(record, tautulli, serverId) {
    // Parse the basic record
    const sessionData = tautulli.parseHistoryRecord(record);
    
    // Generate a unique session key
    const sessionKey = `tautulli-${record.id || record.row_id}-${record.started || record.date}`;

    // Check if already exists by tautulliRowId
    const existing = await PlaybackSession.findOne({
      tautulliRowId: record.id || record.row_id,
      serverId
    });

    if (existing) {
      // Update existing with richer Tautulli data (overwrite strategy)
      await PlaybackSession.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...this.buildSessionDocument(sessionData, serverId, sessionKey),
            source: 'tautulli'
          }
        }
      );
      return;
    }

    // Create new session
    await PlaybackSession.create({
      ...this.buildSessionDocument(sessionData, serverId, sessionKey),
      source: 'tautulli'
    });
  }

  /**
   * Build session document from parsed data
   */
  buildSessionDocument(data, serverId, sessionKey) {
    return {
      sessionKey,
      serverId,
      tautulliRowId: data.tautulliRowId,
      tautulliSessionKey: data.tautulliSessionKey,
      mediaType: data.mediaType,
      ratingKey: data.ratingKey,
      parentRatingKey: data.parentRatingKey,
      grandparentRatingKey: data.grandparentRatingKey,
      mediaTitle: data.mediaTitle,
      viewedAt: data.viewedAt,
      startedAt: data.startedAt,
      stoppedAt: data.stoppedAt,
      duration: data.duration,
      watchedDuration: data.watchedDuration,
      pausedDuration: data.pausedDuration,
      userId: data.userId,
      userName: data.userName,
      userThumb: data.userThumb,
      device: data.device,
      ipAddress: data.ipAddress,
      location: data.location,
      secure: data.secure,
      relayed: data.relayed,
      qualityProfile: data.qualityProfile,
      optimizedVersion: data.optimizedVersion,
      syncedVersion: data.syncedVersion,
      playback: data.playback,
      mediaSnapshot: data.mediaSnapshot,
      streamOutput: data.streamOutput,
      bandwidth: data.bandwidth
    };
  }

  /**
   * Start real-time sync (polls for new sessions)
   */
  async startRealtimeSync() {
    const config = await TautulliConfig.getConfig();
    if (!config || !config.syncEnabled) {
      console.log('Tautulli real-time sync disabled or not configured');
      return;
    }

    if (this.syncIntervalId) {
      console.log('Tautulli real-time sync already running');
      return;
    }

    const intervalMs = (config.syncIntervalSeconds || 60) * 1000;
    
    console.log(`Starting Tautulli real-time sync every ${config.syncIntervalSeconds}s`);

    // Run immediately
    await this.syncRecentSessions();

    // Then run on interval
    this.syncIntervalId = setInterval(async () => {
      await this.syncRecentSessions();
    }, intervalMs);
  }

  /**
   * Stop real-time sync
   */
  stopRealtimeSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Tautulli real-time sync stopped');
    }
  }

  /**
   * Sync recent sessions from Tautulli
   */
  async syncRecentSessions() {
    if (this.isSyncing || this.isImporting) return;

    try {
      this.isSyncing = true;

      const config = await TautulliConfig.getConfig();
      if (!config || !config.syncEnabled) return;

      const server = await PlexServer.getServer();
      if (!server) return;

      const tautulli = new TautulliService(config.host, config.getDecryptedApiKey());

      // Get recent sessions (last 50)
      const historyData = await tautulli.getHistory({
        length: 50,
        orderColumn: 'date',
        orderDir: 'desc'
      });

      let syncedCount = 0;
      const sessions = historyData.sessions || [];

      for (const record of sessions) {
        try {
          const sessionData = tautulli.parseHistoryRecord(record);
          const sessionKey = `tautulli-${record.id || record.row_id}-${record.started || record.date}`;

          // Upsert - update if exists, insert if not
          await PlaybackSession.updateOne(
            { tautulliRowId: record.id || record.row_id, serverId: server._id },
            {
              $set: {
                ...this.buildSessionDocument(sessionData, server._id, sessionKey),
                source: 'tautulli'
              }
            },
            { upsert: true }
          );

          syncedCount++;
        } catch (error) {
          // Ignore duplicates and continue
          if (error.code !== 11000) {
            console.error('Error syncing session:', error.message);
          }
        }
      }

      // Update sync status
      await TautulliConfig.updateSyncStatus(syncedCount);

    } catch (error) {
      console.error('Tautulli sync error:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Helper to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const tautulliSyncService = new TautulliSyncService();

module.exports = tautulliSyncService;
