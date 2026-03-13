const express = require('express');
const router = express.Router();
const { getInboxNotifications, markNotificationAsRead, getUnreadCount } = require('../controllers/inboxController-pegawai');

router.get('/notifications', getInboxNotifications);
router.post('/mark-read', markNotificationAsRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;
