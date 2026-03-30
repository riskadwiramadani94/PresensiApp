const express = require('express');
const router = express.Router();
const { getTracking, updateLocation, heartbeat } = require('../controllers/trackingController-admin');

router.get('/tracking', getTracking);
router.post('/update-location', updateLocation);
router.post('/heartbeat', heartbeat);

module.exports = router;
