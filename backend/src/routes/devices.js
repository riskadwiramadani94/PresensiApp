const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');
const PushNotificationService = require('../services/pushNotificationService');
const jwt = require('jsonwebtoken');

// Middleware untuk autentikasi
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token tidak valid' });
    }
    req.user = user;
    next();
  });
};

// Register atau update push token
router.post('/register', async (req, res) => {
  try {
    const { push_token, device_type, device_name, user_id } = req.body;
    
    // Support 2 cara: dengan JWT token ATAU dengan user_id langsung
    let userId;
    
    if (user_id) {
      // Cara 1: Langsung pakai user_id (untuk compatibility)
      userId = user_id;
    } else if (req.user) {
      // Cara 2: Dari JWT token (jika ada authenticateToken middleware)
      userId = req.user.id_user;
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID atau auth token diperlukan'
      });
    }

    if (!push_token) {
      return res.status(400).json({
        success: false,
        message: 'Push token diperlukan'
      });
    }

    const db = await getConnection();

    // Cek apakah kombinasi push_token + user_id sudah ada
    const [existing] = await db.execute(
      'SELECT id_device FROM user_devices WHERE push_token = ? AND id_user = ?',
      [push_token, userId]
    );

    if (existing.length > 0) {
      // Update existing device (hanya update is_active & last_active)
      await db.execute(
        `UPDATE user_devices 
         SET is_active = 1, last_active = NOW(), device_type = ?, device_name = ?
         WHERE push_token = ? AND id_user = ?`,
        [device_type || 'android', device_name || null, push_token, userId]
      );

      console.log(`[DEVICE] Updated device for user ${userId}`);

      return res.json({
        success: true,
        message: 'Push token berhasil diupdate'
      });
    } else {
      // Insert new device (buat row baru untuk user ini)
      await db.execute(
        `INSERT INTO user_devices (id_user, push_token, device_type, device_name, is_active, last_active, created_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [userId, push_token, device_type || 'android', device_name || null]
      );

      console.log(`[DEVICE] Registered new device for user ${userId}`);

      return res.json({
        success: true,
        message: 'Push token berhasil didaftarkan'
      });
    }

  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendaftarkan push token'
    });
  }
});

// Get user devices
router.get('/my-devices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id_user;
    const db = await getConnection();

    const [devices] = await db.execute(
      `SELECT id_device, device_type, device_name, is_active, last_active, created_at
       FROM user_devices
       WHERE id_user = ?
       ORDER BY last_active DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: devices
    });

  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data device'
    });
  }
});

// Delete device
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const userId = req.user.id_user;
    const db = await getConnection();

    // Pastikan device milik user yang login
    await db.execute(
      'DELETE FROM user_devices WHERE id_device = ? AND id_user = ?',
      [deviceId, userId]
    );

    res.json({
      success: true,
      message: 'Device berhasil dihapus'
    });

  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus device'
    });
  }
});

// TEST ENDPOINT - Kirim notifikasi test ke user yang login
router.get('/test-push', async (req, res) => {
  try {
    // Support 2 cara: dengan JWT token ATAU dengan user_id dari query
    let userId;
    
    if (req.query.user_id) {
      // Cara 1: Dari query parameter (untuk testing mudah)
      userId = parseInt(req.query.user_id);
    } else if (req.user) {
      // Cara 2: Dari JWT token (jika ada authenticateToken middleware)
      userId = req.user.id_user;
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID diperlukan. Gunakan ?user_id=21'
      });
    }
    
    console.log('[TEST] Sending test notification to user:', userId);
    
    await PushNotificationService.sendToUser(
      userId,
      '🔔 Test Notifikasi',
      'Sistem push notification berfungsi dengan baik. Notifikasi akan muncul otomatis sesuai jadwal dan event yang terjadi.',
      'info',
      { test: true, timestamp: new Date().toISOString() }
    );
    
    res.json({
      success: true,
      message: 'Test notification berhasil dikirim! Cek HP Anda.'
    });

  } catch (error) {
    console.error('[TEST] Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim test notification',
      error: error.message
    });
  }
});

// TEST ENDPOINT - Kirim notifikasi ke semua pegawai
router.get('/test-push-all', authenticateToken, async (req, res) => {
  try {
    // Hanya admin yang bisa kirim ke semua pegawai
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya admin yang bisa menggunakan endpoint ini'
      });
    }

    console.log('[TEST] Sending test notification to all pegawai');
    
    const db = await getConnection();
    const [pegawai] = await db.execute(
      "SELECT id_user FROM users WHERE role = 'pegawai'"
    );
    
    const pegawaiIds = pegawai.map(p => p.id_user);
    
    if (pegawaiIds.length === 0) {
      return res.json({
        success: false,
        message: 'Tidak ada pegawai untuk dikirim notifikasi'
      });
    }
    
    await PushNotificationService.sendToMultipleUsers(
      pegawaiIds,
      '🧪 Test Broadcast',
      'Ini adalah test broadcast notification ke semua pegawai!',
      'info',
      { test: true, broadcast: true }
    );
    
    res.json({
      success: true,
      message: `Test notification berhasil dikirim ke ${pegawaiIds.length} pegawai!`
    });

  } catch (error) {
    console.error('[TEST] Error sending broadcast notification:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim broadcast notification',
      error: error.message
    });
  }
});

// TEST ENDPOINT - Cek jam kerja hari ini
router.get('/test-jam-kerja', async (req, res) => {
  try {
    const db = await getConnection();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    const currentDay = dayNames[now.getDay()];
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Cek jam_kerja_history
    const [jamKerjaHistory] = await db.execute(`
      SELECT * FROM jam_kerja_history 
      WHERE hari = ? 
      AND ? BETWEEN tanggal_mulai_berlaku AND IFNULL(tanggal_selesai_berlaku, '9999-12-31')
      ORDER BY tanggal_mulai_berlaku DESC
      LIMIT 1
    `, [currentDay, today]);
    
    // Cek jam_kerja_hari
    const [jamKerjaHari] = await db.execute(
      'SELECT * FROM jam_kerja_hari WHERE hari = ?',
      [currentDay]
    );
    
    // Cek pegawai yang sudah absen masuk tapi belum pulang
    const [pegawaiAbsen] = await db.execute(
      `SELECT id_user, jam_masuk FROM presensi 
       WHERE tanggal = CURDATE() AND jam_masuk IS NOT NULL AND jam_pulang IS NULL`
    );
    
    res.json({
      success: true,
      data: {
        current_time: currentTime,
        current_day: currentDay,
        today: today,
        jam_kerja_history: jamKerjaHistory.length > 0 ? jamKerjaHistory[0] : null,
        jam_kerja_hari: jamKerjaHari.length > 0 ? jamKerjaHari[0] : null,
        pegawai_belum_pulang: pegawaiAbsen.length,
        pegawai_list: pegawaiAbsen
      }
    });
    
  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal cek jam kerja',
      error: error.message
    });
  }
});

module.exports = router;
