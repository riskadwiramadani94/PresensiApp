const express = require('express');
const router = express.Router();
const { realtimeCheck } = require('../controllers/realtimeController');

// Real-time check endpoint
router.get('/check', realtimeCheck);

module.exports = router;