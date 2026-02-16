const notificationService = require('../services/notification.service');
const { NotificationPreference } = require('../models');

/**
 * GET /api/notifications/vapid-public-key
 */
exports.getVapidPublicKey = async (req, res, next) => {
  try {
    const publicKey = notificationService.getPublicKey();
    if (!publicKey) {
      return res.status(503).json({ error: 'Push notifications not initialized' });
    }
    res.json({ publicKey });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/subscribe
 */
exports.subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }
    const userAgent = req.headers['user-agent'] || null;
    await notificationService.subscribe(subscription, userAgent);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/unsubscribe
 */
exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    await notificationService.unsubscribe(endpoint);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/preferences
 */
exports.getPreferences = async (req, res, next) => {
  try {
    const prefs = await NotificationPreference.getPreferences();
    const subCount = await notificationService.getSubscriptionCount();
    res.json({ preferences: prefs, subscribedDevices: subCount });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/preferences
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const prefs = await NotificationPreference.savePreferences(req.body);
    res.json({ preferences: prefs });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await notificationService.getHistory(limit);
    res.json({ history });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/test
 */
exports.sendTest = async (req, res, next) => {
  try {
    await notificationService.notify('streaming_started', {
      title: '🔔 Test Notification',
      body: 'Push notifications are working!',
      url: '/settings'
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
