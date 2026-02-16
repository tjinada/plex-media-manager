const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

router.get('/vapid-public-key', notificationController.getVapidPublicKey);
router.post('/subscribe', notificationController.subscribe);
router.post('/unsubscribe', notificationController.unsubscribe);
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);
router.get('/history', notificationController.getHistory);
router.post('/test', notificationController.sendTest);

module.exports = router;
