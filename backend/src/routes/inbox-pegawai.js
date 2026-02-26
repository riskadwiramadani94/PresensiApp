const express = require('express');
const router = express.Router();
const { getInboxNotifications } = require('../controllers/inboxController-pegawai');

router.get('/notifications', getInboxNotifications);

module.exports = router;
