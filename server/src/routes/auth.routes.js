const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.get('/status', authController.getStatus);
router.post('/login', authController.login);

module.exports = router;
