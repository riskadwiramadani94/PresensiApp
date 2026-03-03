const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

// Get work schedule for specific day
router.get('/work-schedule/today', async (req, res) => {
  try {
    const { hari } = req.query;
    const db = await getConnection();
    
    const query = `
      SELECT jam_masuk, jam_pulang, is_kerja 
      FROM jam_kerja_hari 
      WHERE hari = ?
      LIMIT 1
    `;
    
    const [results] = await db.execute(query, [hari]);
    
    if (results.length > 0) {
      res.json({
        success: true,
        data: {
          jam_masuk: results[0].jam_masuk,
          jam_pulang: results[0].jam_pulang,
          is_kerja: results[0].is_kerja
        }
      });
    } else {
      // Fallback jika data tidak ditemukan
      res.json({
        success: true,
        data: {
          jam_masuk: '08:00:00',
          jam_pulang: '17:00:00',
          is_kerja: 1
        }
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.json({
      success: false,
      message: 'Error fetching today work schedule: ' + error.message
    });
  }
});

// Get work schedule
router.get('/work-schedule', async (req, res) => {
  try {
    const db = await getConnection();
    const query = `
      SELECT hari, jam_masuk, jam_pulang, is_kerja 
      FROM jam_kerja_hari 
      ORDER BY FIELD(hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')
    `;
    
    const [results] = await db.execute(query);
    
    if (results.length > 0) {
      const workDays = results.filter(day => day.is_kerja === 1).map(day => day.hari);
      const firstWorkDay = results.find(day => day.is_kerja === 1);
      
      res.json({
        success: true,
        data: {
          jam_masuk: firstWorkDay ? firstWorkDay.jam_masuk : '08:00:00',
          jam_pulang: firstWorkDay ? firstWorkDay.jam_pulang : '17:00:00',
          hari_kerja: workDays
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          jam_masuk: '08:00:00',
          jam_pulang: '17:00:00',
          hari_kerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
        }
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.json({
      success: false,
      message: 'Error fetching work schedule'
    });
  }
});

// Get holidays
router.get('/holidays', async (req, res) => {
  try {
    const db = await getConnection();
    const query = `
      SELECT tanggal, nama_libur, jenis
      FROM hari_libur 
      WHERE YEAR(tanggal) = YEAR(CURDATE()) AND is_active = 1
      ORDER BY tanggal ASC
    `;
    
    const [results] = await db.execute(query);
    
    res.json({
      success: true,
      data: results.map(holiday => ({
        tanggal: holiday.tanggal.toISOString().split('T')[0],
        nama: holiday.nama_libur,
        jenis: holiday.jenis || 'nasional'
      }))
    });
  } catch (error) {
    console.error('Database error:', error);
    res.json({
      success: false,
      message: 'Error fetching holidays'
    });
  }
});

module.exports = router;