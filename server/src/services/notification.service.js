const webpush = require('web-push');
const { PushSubscription, NotificationPreference, NotificationLog } = require('../models');
const environment = require('../config/environment');

class NotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize VAPID — uses environment variables (pre-generated keys)
   */
  async initialize() {
    try {
      if (!environment.vapid.configured) {
        console.log('Push notifications not configured (set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL)');
        return;
      }

      webpush.setVapidDetails(
        environment.vapid.email,
        environment.vapid.publicKey,
        environment.vapid.privateKey
      );

      this.initialized = true;
      console.log(`Push notification service initialized (subject: ${environment.vapid.email})`);
    } catch (error) {
      console.error('Failed to initialize push notifications:', error.message);
    }
  }

  /**
   * Get the public VAPID key (sent to clients for subscription)
   */
  getPublicKey() {
    return environment.vapid.publicKey || null;
  }

  /**
   * Save a push subscription from a client
   */
  async subscribe(subscription, userAgent) {
    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: userAgent || null,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  /**
   * Remove a push subscription
   */
  async unsubscribe(endpoint) {
    await PushSubscription.deleteOne({ endpoint });
  }

  /**
   * Send a notification for a given category
   * @param {string} category - notification category
   * @param {object} options - { title, body, url }
   * @param {boolean} [bypassPrefs=false] - skip preference checks (for test notifications)
   */
  async notify(category, { title, body, url }, bypassPrefs = false) {
    if (!this.initialized) {
      console.log('[notify] ABORT: not initialized');
      return;
    }

    try {
      // Check preferences (unless bypassed for test notifications)
      if (!bypassPrefs) {
        const prefs = await NotificationPreference.getPreferences();
        if (!prefs.enabled) return;

        const catPref = prefs.categories?.[category];
        if (!catPref || !catPref.enabled) return;
      }

      // Get all subscriptions
      const subscriptions = await PushSubscription.find();
      console.log(`[notify] Sending [${category}] to ${subscriptions.length} subscriptions`);
      if (subscriptions.length === 0) return;

      // Flat payload format — handled by custom service worker push handler
      const payload = JSON.stringify({
        title,
        body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png',
        tag: category,
        data: {
          url: url || '/',
          category
        }
      });

      let sentCount = 0;
      let failedCount = 0;
      const expiredEndpoints = [];

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          );
          sentCount++;
        } catch (error) {
          failedCount++;
          console.error(`Push failed for ${sub.endpoint.substring(0, 60)}...: status=${error.statusCode}, body=${error.body}`);
          if (error.statusCode === 404 || error.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      }

      // Cleanup expired subscriptions
      if (expiredEndpoints.length > 0) {
        await PushSubscription.deleteMany({ endpoint: { $in: expiredEndpoints } });
        console.log(`Removed ${expiredEndpoints.length} expired push subscriptions`);
      }

      // Log notification
      await NotificationLog.create({
        category,
        title,
        body,
        url,
        sentAt: new Date(),
        recipientCount: sentCount,
        failedCount
      });

      if (sentCount > 0) {
        console.log(`Push notification sent: [${category}] "${title}" to ${sentCount} devices`);
      }
    } catch (error) {
      console.error(`Notification error [${category}]:`, error.message);
    }
  }

  /**
   * Notify: someone started streaming
   * @param {object} session - Transformed session from HomeAggregatorService
   */
  async notifyStreamingStarted(session) {
    const userName = session.user?.name || 'Someone';

    // Build media title
    let mediaTitle;
    if (session.media?.type === 'episode' && session.media?.showTitle) {
      mediaTitle = `${session.media.showTitle}`;
      if (session.media.seasonEpisode) {
        mediaTitle += ` ${session.media.seasonEpisode}`;
      }
      if (session.media.title) {
        mediaTitle += ` - ${session.media.title}`;
      }
    } else {
      mediaTitle = session.media?.title || 'Unknown Media';
    }

    // Build detail line
    const parts = [];
    const resolution = session.streamQuality?.resolution || session.quality?.resolution;
    if (resolution && resolution !== 'Unknown') parts.push(resolution);
    const decision = session.playback?.decision;
    if (decision === 'transcode') parts.push('Transcode');
    else if (decision === 'copy') parts.push('Direct Stream');
    else if (decision === 'directplay') parts.push('Direct Play');
    const playerName = session.player?.name;
    if (playerName && playerName !== 'Unknown') parts.push(playerName);
    const detail = parts.length > 0 ? `\n${parts.join(' · ')}` : '';

    await this.notify('streaming_started', {
      title: `🎬 ${userName} is watching`,
      body: `${mediaTitle}${detail}`,
      url: '/home'
    });
  }

  /**
   * Notify: compatibility issues found after sync
   */
  async notifyCompatibilityIssues(issues) {
    if (!issues || issues.length === 0) return;

    const prefs = await NotificationPreference.getPreferences();
    const minSeverity = prefs.categories?.compatibility_issue?.minSeverity || 'critical';

    let filtered = issues;
    if (minSeverity === 'critical') {
      filtered = issues.filter(i => i.severity === 'critical');
    } else if (minSeverity === 'medium') {
      filtered = issues.filter(i => i.severity === 'critical' || i.severity === 'medium');
    }

    if (filtered.length === 0) return;

    const criticalCount = filtered.filter(i => i.severity === 'critical').length;
    const mediumCount = filtered.filter(i => i.severity === 'medium').length;

    const parts = [];
    if (criticalCount > 0) parts.push(`${criticalCount} critical`);
    if (mediumCount > 0) parts.push(`${mediumCount} medium`);

    await this.notify('compatibility_issue', {
      title: `⚠️ ${filtered.length} new compatibility issue${filtered.length > 1 ? 's' : ''}`,
      body: parts.join(', ') + ' found after sync',
      url: '/compatibility'
    });
  }

  /**
   * Notify: media download completed
   * @param {object} download - Download item from HomeAggregatorService
   */
  async notifyDownloadCompleted(download) {
    const title = download.title || 'Unknown';
    const type = download.type === 'episode' ? '📺' : '🎬';
    const quality = download.quality ? ` (${download.quality})` : '';
    const sizeGB = download.size ? ` · ${(download.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : '';

    await this.notify('media_downloaded', {
      title: `${type} Download complete`,
      body: `${title}${quality}${sizeGB}`,
      url: download.type === 'episode' ? '/shows' : '/movies'
    });
  }

  /**
   * Notify: missing media detected
   * Only notifies when missing counts increase (newly detected) and at most once per 24 hours
   */
  async notifyMissingMedia({ missingMovies, missingEpisodes }) {
    if (missingMovies === 0 && missingEpisodes === 0) return;

    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('app_settings');

      // Get last known state
      const lastState = await collection.findOne({ key: 'last_missing_counts' });
      const prevMovies = lastState?.missingMovies || 0;
      const prevEpisodes = lastState?.missingEpisodes || 0;
      const lastNotified = lastState?.lastNotifiedAt ? new Date(lastState.lastNotifiedAt) : null;

      // Only care about increases (newly missing)
      const newMovies = Math.max(0, missingMovies - prevMovies);
      const newEpisodes = Math.max(0, missingEpisodes - prevEpisodes);

      // 24-hour cooldown
      const cooldownMs = 24 * 60 * 60 * 1000;
      const cooldownPassed = !lastNotified || (Date.now() - lastNotified.getTime()) >= cooldownMs;

      // Notify only if new items AND cooldown passed
      if ((newMovies > 0 || newEpisodes > 0) && cooldownPassed) {
        const parts = [];
        if (newMovies > 0) parts.push(`${newMovies} movie${newMovies > 1 ? 's' : ''}`);
        if (newEpisodes > 0) parts.push(`${newEpisodes} episode${newEpisodes > 1 ? 's' : ''}`);

        await this.notify('missing_media', {
          title: `📋 Missing media detected`,
          body: `${parts.join(' and ')} newly missing from your library`,
          url: '/wanted'
        });

        // Save with notification timestamp
        await collection.updateOne(
          { key: 'last_missing_counts' },
          { $set: { key: 'last_missing_counts', missingMovies, missingEpisodes, lastNotifiedAt: new Date() } },
          { upsert: true }
        );
      } else {
        // Save updated counts without touching lastNotifiedAt
        await collection.updateOne(
          { key: 'last_missing_counts' },
          { $set: { key: 'last_missing_counts', missingMovies, missingEpisodes } },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error('Missing media notification error:', error.message);
    }
  }

  /**
   * Get notification history
   */
  async getHistory(limit = 50) {
    return NotificationLog.find()
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get subscription count
   */
  async getSubscriptionCount() {
    return PushSubscription.countDocuments();
  }
}

module.exports = new NotificationService();
