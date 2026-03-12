const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/inbox/notifications
 * Generate notifikasi dari tabel yang sudah ada (TANPA tabel notifications)
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
    
    console.log(`[INBOX] Getting notifications for user ${user_id} (${role})`);
    
    const notifications = [];
    
    // === NOTIFIKASI UNTUK PEGAWAI ===
    if (role === 'pegawai') {
      
      // 1. Pengajuan yang sudah disetujui/ditolak (7 hari terakhir)
      const [pengajuan] = await db.query(`
        SELECT 
          id_pengajuan,
          jenis_pengajuan,
          status,
          waktu_persetujuan,
          catatan_persetujuan
        FROM pengajuan 
        WHERE id_user = ? 
        AND status IN ('disetujui', 'ditolak')
        AND waktu_persetujuan >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY waktu_persetujuan DESC
      `, [user_id]);
      
      pengajuan.forEach(p => {
        notifications.push({
          id: `pengajuan-${p.id_pengajuan}`,
          type: p.status === 'disetujui' ? 'pengajuan_approved' : 'pengajuan_rejected',
          title: p.status === 'disetujui' ? 'Pengajuan Disetujui ✅' : 'Pengajuan Ditolak ❌',
          message: `Pengajuan ${p.jenis_pengajuan} ${p.status}${p.catatan_persetujuan ? '. ' + p.catatan_persetujuan : ''}`,
          time: p.waktu_persetujuan,
          reference_type: 'pengajuan',
          reference_id: p.id_pengajuan,
          icon: p.status === 'disetujui' ? '✅' : '❌'
        });
      });
      
      // 2. Dinas yang ditugaskan (pending konfirmasi)
      const [dinas] = await db.query(`
        SELECT 
          d.id_dinas,
          d.nama_kegiatan,
          d.tanggal_mulai,
          d.tanggal_selesai,
          d.created_at,
          dp.status_konfirmasi
        FROM dinas_pegawai dp
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.id_user = ? 
        AND dp.status_konfirmasi = 'pending'
        ORDER BY d.created_at DESC
      `, [user_id]);
      
      dinas.forEach(d => {
        notifications.push({
          id: `dinas-${d.id_dinas}`,
          type: 'dinas_assigned',
          title: 'Ditugaskan ke Dinas 🚀',
          message: `Anda ditugaskan ke: ${d.nama_kegiatan}`,
          time: d.created_at,
          reference_type: 'dinas',
          reference_id: d.id_dinas,
          icon: '🚀'
        });
      });
      
      // 3. Lembur yang sudah disetujui/ditolak (7 hari terakhir)
      const [lembur] = await db.query(`
        SELECT 
          id_pengajuan,
          jenis_pengajuan,
          status,
          waktu_persetujuan
        FROM pengajuan 
        WHERE id_user = ? 
        AND jenis_pengajuan = 'lembur'
        AND status IN ('disetujui', 'ditolak')
        AND waktu_persetujuan >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY waktu_persetujuan DESC
      `, [user_id]);
      
      lembur.forEach(l => {
        notifications.push({
          id: `lembur-${l.id_pengajuan}`,
          type: l.status === 'disetujui' ? 'lembur_approved' : 'lembur_rejected',
          title: l.status === 'disetujui' ? 'Lembur Disetujui ✅' : 'Lembur Ditolak ❌',
          message: `Pengajuan lembur ${l.status}`,
          time: l.waktu_persetujuan,
          reference_type: 'pengajuan',
          reference_id: l.id_pengajuan,
          icon: l.status === 'disetujui' ? '✅' : '❌'
        });
      });
    }
    
    // === NOTIFIKASI UNTUK ADMIN ===
    else if (role === 'admin') {
      
      // 1. Pengajuan yang menunggu approval
      const [pengajuan] = await db.query(`
        SELECT 
          p.id_pengajuan,
          p.jenis_pengajuan,
          p.tanggal_pengajuan,
          u.nama_lengkap
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        WHERE p.status = 'menunggu'
        ORDER BY p.tanggal_pengajuan DESC
        LIMIT 50
      `);
      
      pengajuan.forEach(p => {
        notifications.push({
          id: `pengajuan-${p.id_pengajuan}`,
          type: 'pengajuan_baru',
          title: 'Pengajuan Baru 📝',
          message: `${p.nama_lengkap} mengajukan ${p.jenis_pengajuan}`,
          time: p.tanggal_pengajuan,
          reference_type: 'pengajuan',
          reference_id: p.id_pengajuan,
          icon: '📝'
        });
      });
      
      // 2. Presensi yang perlu validasi
      const [presensi] = await db.query(`
        SELECT 
          pr.id_presensi,
          pr.tanggal,
          pr.jam_masuk,
          pr.status_validasi_masuk,
          pr.status_validasi_pulang,
          u.nama_lengkap
        FROM presensi pr
        JOIN users u ON pr.id_user = u.id_user
        WHERE (pr.status_validasi_masuk = 'menunggu' OR pr.status_validasi_pulang = 'menunggu')
        AND pr.tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY pr.tanggal DESC, pr.jam_masuk DESC
        LIMIT 30
      `);
      
      presensi.forEach(p => {
        const needValidation = [];
        if (p.status_validasi_masuk === 'menunggu') needValidation.push('masuk');
        if (p.status_validasi_pulang === 'menunggu') needValidation.push('pulang');
        
        notifications.push({
          id: `presensi-${p.id_presensi}`,
          type: 'presensi_validasi',
          title: 'Presensi Perlu Validasi ⚠️',
          message: `${p.nama_lengkap} - Validasi ${needValidation.join(' & ')}`,
          time: p.tanggal,
          reference_type: 'presensi',
          reference_id: p.id_presensi,
          icon: '⚠️'
        });
      });
    }
    
    // Sort by time (terbaru dulu)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    console.log(`[INBOX] Found ${notifications.length} notifications`);
    
    res.json({ 
      success: true, 
      data: notifications,
      count: notifications.length
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

module.exports = router;