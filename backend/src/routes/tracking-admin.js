const express = require('express');
const router = express.Router();
const { getTracking, updateLocation } = require('../controllers/trackingController-admin');

router.get('/tracking', getTracking);
router.post('/update-location', updateLocation);

module.exports = router;
