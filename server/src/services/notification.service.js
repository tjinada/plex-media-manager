const webpush = require('web-push');
const { PushSubscription, NotificationPreference, NotificationLog } = require('../models');

class NotificationService {
  constructor() {
    this.vapidKeys = null;
    this.initialized = false;
  }

  /**
   * Initialize VAPID keys — generates once, stores in MongoDB Settings-style
   */
  async initialize() {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const settingsCol = db.collection('app_settings');

      let doc = await settingsCol.findOne({ key: 'vapid_keys' });
      if (!doc) {
        // Generate new VAPID keys
        const keys = webpush.generateVAPIDKeys();
        doc = {
          key: 'vapid_keys',
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
          createdAt: new Date()
        };
        await settingsCol.insertOne(doc);
        console.log('Generated new VAPID keys');
      }

      this.vapidKeys = {
        publicKey: doc.publicKey,
        privateKey: doc.privateKey
      };

      // Use CLIENT_URL domain for VAPID subject, or fallback
      const clientUrl = require('../config/environment').clientUrl;
      let vapidSubject = 'mailto:admin@localhost';
      try {
        const host = new URL(clientUrl).hostname;
        vapidSubject = `mailto:admin@${host}`;
      } catch {}

      webpush.setVapidDetails(
        vapidSubject,
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );

      this.initialized = true;
      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error.message);
    }
  }

  /**
   * Get the public VAPID key (sent to clients for subscription)
   */
  getPublicKey() {
    return this.vapidKeys?.publicKey || null;
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
    console.log(`[notify] called: category=${category}, bypassPrefs=${bypassPrefs}, initialized=${this.initialized}`);
    if (!this.initialized) {
      console.log('[notify] ABORT: not initialized');
      return;
    }

    try {
      // Check preferences (unless bypassed for test notifications)
      if (!bypassPrefs) {
        const prefs = await NotificationPreference.getPreferences();
        if (!prefs.enabled) {
          console.log('[notify] ABORT: notifications disabled in preferences');
          return;
        }

        const catPref = prefs.categories?.[category];
        if (!catPref || !catPref.enabled) {
          console.log(`[notify] ABORT: category ${category} disabled`);
          return;
        }
      }

      // Get all subscriptions
      const subscriptions = await PushSubscription.find();
      console.log(`[notify] Found ${subscriptions.length} subscriptions`);
      if (subscriptions.length === 0) return;

      const payload = JSON.stringify({
        notification: {
          title,
          body,
          icon: '/assets/icons/icon-192x192.png',
          badge: '/assets/icons/icon-192x192.png',
          data: {
            url: url || '/',
            category,
            onActionClick: {
              default: { operation: 'navigateLastFocusedOrOpen', url: url || '/' }
            }
          }
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
          console.error(`Push failed for ${sub.endpoint.substring(0, 60)}...: status=${error.statusCode}, message=${error.body || error.message}`);
          // 410 Gone, 404, or 403 = subscription expired/invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
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
   */
  async notifyStreamingStarted(session) {
    const userName = session.userName || session.User?.title || 'Someone';
    const mediaTitle = session.grandparentTitle
      ? `${session.grandparentTitle} - ${session.title}`
      : (session.title || 'Unknown Media');

    const parts = [];
    if (session.resolution || session.quality) parts.push(session.resolution || session.quality);
    if (session.videoDecision) parts.push(session.videoDecision === 'transcode' ? 'Transcode' : 'Direct Play');
    const detail = parts.length > 0 ? ` (${parts.join(' · ')})` : '';

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

    // Check severity preference
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
   */
  async notifyDownloadCompleted(download) {
    const title = download.title || 'Unknown';
    const type = download.type === 'episode' ? '📺' : '🎬';
    const quality = download.quality ? ` (${download.quality})` : '';
    const size = download.size ? ` · ${download.size}` : '';

    await this.notify('media_downloaded', {
      title: `${type} Download complete`,
      body: `${title}${quality}${size}`,
      url: download.type === 'episode' ? '/shows' : '/movies'
    });
  }

  /**
   * Notify: missing media detected
   */
  async notifyMissingMedia({ missingMovies, missingEpisodes }) {
    const parts = [];
    if (missingMovies > 0) parts.push(`${missingMovies} movie${missingMovies > 1 ? 's' : ''}`);
    if (missingEpisodes > 0) parts.push(`${missingEpisodes} episode${missingEpisodes > 1 ? 's' : ''}`);

    if (parts.length === 0) return;

    await this.notify('missing_media', {
      title: `📋 New missing media detected`,
      body: `${parts.join(' and ')} missing from your library`,
      url: '/wanted'
    });
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
