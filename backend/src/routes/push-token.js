const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware auth (sesuaikan dengan yang Anda punya)
// const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/push-token/save
 * Save push token dari device
 */
router.post('/save', async (req, res) => {
  try {
    const { user_id, push_token, device_type, device_name } = req.body;
    
    if (!user_id || !push_token || !device_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id, push_token, dan device_type wajib diisi' 
      });
    }
    
    console.log(`[PUSH TOKEN] Saving for user ${user_id}: ${push_token}`);
    
    // Simpan atau update push token
    await db.query(`
      INSERT INTO user_devices (id_user, push_token, device_type, device_name, is_active, last_active)
      VALUES (?, ?, ?, ?, TRUE, NOW())
      ON DUPLICATE KEY UPDATE 
        id_user = VALUES(id_user),
        device_type = VALUES(device_type),
        device_name = VALUES(device_name),
        is_active = TRUE,
        last_active = NOW()
    `, [user_id, push_token, device_type, device_name || null]);
    
    res.json({ 
      success: true, 
      message: 'Push token saved successfully' 
    });
  } catch (error) {
    console.error('[PUSH TOKEN] Save error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save push token',
      error: error.message 
    });
  }
});

/**
 * POST /api/push-token/remove
 * Remove push token (saat logout)
 */
router.post('/remove', async (req, res) => {
  try {
    const { push_token } = req.body;
    
    if (!push_token) {
      return res.status(400).json({ 
        success: false, 
        message: 'push_token wajib diisi' 
      });
    }
    
    console.log(`[PUSH TOKEN] Removing: ${push_token}`);
    
    // Nonaktifkan device
    await db.query(`
      UPDATE user_devices 
      SET is_active = FALSE 
      WHERE push_token = ?
    `, [push_token]);
    
    res.json({ 
      success: true, 
      message: 'Push token removed successfully' 
    });
  } catch (error) {
    console.error('[PUSH TOKEN] Remove error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove push token',
      error: error.message 
    });
  }
});

module.exports = router;
