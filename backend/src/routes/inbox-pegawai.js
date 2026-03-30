const express = require('express');
const router = express.Router();
const { getInboxNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount } = require('../controllers/inboxController-pegawai');

router.get('/notifications', getInboxNotifications);
router.post('/mark-read', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;
