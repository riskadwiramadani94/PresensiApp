const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

/**
 * GET /api/inbox/notifications
 * Kotak masuk terpusat - ambil dari tabel notifikasi database
 */
router.get('/notifications', async (req, res) => {
  try {
    const { user_id, role } = req.query;
    
    if (!user_id || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id dan role wajib diisi' 
      });
    }
    
    console.log(`[INBOX] Getting notifications from database for user ${user_id} (${role})`);
    
    const db = await getConnection();
    
    // Ambil notifikasi dari database (tabel notifikasi)
    const [notifications] = await db.execute(`
      SELECT 
        id_notifikasi as id,
        judul as title,
        pesan as message,
        tipe as type,
        data,
        is_read,
        created_at as time
      FROM notifikasi
      WHERE id_user = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [user_id]);
    
    // Parse data JSON dan tambahkan properti tambahan
    const formattedNotifications = notifications.map(notif => {
      let parsedData = {};
      try {
        parsedData = JSON.parse(notif.data || '{}');
      } catch (e) {
        console.error('Failed to parse notification data:', e);
      }
      
      // Tentukan icon, priority, reference_type berdasarkan tipe
      let icon = 'notifications';
      let priority = 'medium';
      let reference_type = null;
      let reference_id = null;
      
      if (notif.type === 'pengajuan_approved' || notif.type === 'pengajuan_rejected' || notif.type === 'pengajuan_baru') {
        icon = notif.type === 'pengajuan_approved' ? 'checkmark-circle' : notif.type === 'pengajuan_rejected' ? 'close-circle' : 'document-text';
        priority = 'high';
        reference_type = 'pengajuan';
        reference_id = parsedData.id_pengajuan || parsedData.reference_id;
      } else if (notif.type === 'absen_masuk' || notif.type === 'absen_pulang' || notif.type === 'absen_dinas_masuk' || notif.type === 'absen_dinas_pulang') {
        icon = 'location';
        priority = 'medium';
        reference_type = 'presensi';
        reference_id = parsedData.id_presensi || parsedData.reference_id;
      } else if (notif.type === 'reminder_masuk' || notif.type === 'reminder_pulang') {
        icon = 'time';
        priority = 'medium';
        reference_type = 'presensi';
      } else if (notif.type === 'reminder_terlambat') {
        icon = 'warning';
        priority = 'urgent';
        reference_type = 'presensi';
      } else if (notif.type === 'dinas_assigned' || notif.type === 'dinas_cancelled') {
        icon = 'airplane';
        priority = 'high';
        reference_type = 'dinas';
        reference_id = parsedData.id_dinas || parsedData.reference_id;
      } else if (notif.type === 'validasi_absen_dinas_approved' || notif.type === 'validasi_absen_dinas_rejected') {
        icon = notif.type === 'validasi_absen_dinas_approved' ? 'checkmark-circle' : 'close-circle';
        priority = 'high';
        reference_type = 'presensi';
        reference_id = parsedData.id_presensi || parsedData.reference_id;
      }
      
      return {
        id: `notif-${notif.id}`,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        time: notif.time,
        is_read: notif.is_read === 1,
        icon: icon,
        priority: priority,
        reference_type: reference_type,
        reference_id: reference_id,
        created_at: notif.time
      };
    });
    
    console.log(`[INBOX] Found ${formattedNotifications.length} notifications from database`);
    
    // Debug: Log sample notification
    if (formattedNotifications.length > 0) {
      console.log('[INBOX] Sample notification:', JSON.stringify(formattedNotifications[0], null, 2));
    }
    
    res.json({ 
      success: true, 
      data: formattedNotifications,
      count: formattedNotifications.length,
      unread_count: formattedNotifications.filter(n => !n.is_read).length
    });
    
  } catch (error) {
    console.error('[INBOX] Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get notifications',
      error: error.message 
    });
  }
});

/**
 * GET /api/inbox/unread-count
 * Get jumlah notifikasi yang belum dibaca dari database
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id wajib diisi' 
      });
    }
    
    const db = await getConnection();
    
    // Hitung notifikasi yang belum dibaca dari database
    const [result] = await db.execute(
      'SELECT COUNT(*) as count FROM notifikasi WHERE id_user = ? AND is_read = 0',
      [user_id]
    );
    
    const unreadCount = result[0]?.count || 0;
    
    res.json({ 
      success: true, 
      unread_count: unreadCount
    });
    
  } catch (error) {
    console.error('[INBOX] Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get unread count',
      error: error.message 
    });
  }
});

/**
 * POST /api/inbox/mark-read
 * Mark notifikasi sebagai sudah dibaca
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { notification_id, user_id } = req.body;
    
    if (!notification_id || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'notification_id dan user_id wajib diisi' 
      });
    }
    
    const db = await getConnection();
    
    // Update is_read menjadi 1
    await db.execute(
      'UPDATE notifikasi SET is_read = 1 WHERE id_notifikasi = ? AND id_user = ?',
      [notification_id, user_id]
    );
    
    res.json({ 
      success: true, 
      message: 'Notifikasi berhasil ditandai sebagai sudah dibaca'
    });
    
  } catch (error) {
    console.error('[INBOX] Mark read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification as read',
      error: error.message 
    });
  }
});

/**
 * POST /api/inbox/mark-all-read
 * Mark semua notifikasi sebagai sudah dibaca
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id wajib diisi' });
    }
    const db = await getConnection();
    await db.execute(
      'UPDATE notifikasi SET is_read = 1 WHERE id_user = ? AND is_read = 0',
      [user_id]
    );
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (error) {
    console.error('[INBOX] Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read', error: error.message });
  }
});

module.exports = router;