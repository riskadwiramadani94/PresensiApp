const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/database');

/**
 * GET /api/inbox/notifications
 * Kotak masuk terpusat - semua notifikasi masuk ke sini
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
    
    console.log(`[INBOX] Getting all notifications for user ${user_id} (${role})`);
    
    const db = await getConnection();
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
          catatan_persetujuan,
          tanggal_pengajuan
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
          title: p.status === 'disetujui' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak',
          message: `Pengajuan ${p.jenis_pengajuan} ${p.status}${p.catatan_persetujuan ? '. ' + p.catatan_persetujuan : ''}`,
          time: p.waktu_persetujuan,
          reference_type: 'pengajuan',
          reference_id: p.id_pengajuan,
          icon: p.status === 'disetujui' ? 'checkmark-circle' : 'close-circle',
          priority: 'high'
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
          title: 'Ditugaskan ke Dinas',
          message: `Anda ditugaskan ke: ${d.nama_kegiatan}`,
          time: d.created_at,
          reference_type: 'dinas',
          reference_id: d.id_dinas,
          icon: 'airplane',
          priority: 'high'
        });
      });
      
      // 3. Pengajuan yang masih menunggu (reminder)
      const [pengajuanMenunggu] = await db.query(`
        SELECT 
          id_pengajuan,
          jenis_pengajuan,
          tanggal_pengajuan
        FROM pengajuan 
        WHERE id_user = ? 
        AND status = 'menunggu'
        ORDER BY tanggal_pengajuan DESC
      `, [user_id]);
      
      pengajuanMenunggu.forEach(p => {
        notifications.push({
          id: `pengajuan-menunggu-${p.id_pengajuan}`,
          type: 'pengajuan_pending',
          title: 'Pengajuan Menunggu',
          message: `Pengajuan ${p.jenis_pengajuan} sedang diproses`,
          time: p.tanggal_pengajuan,
          reference_type: 'pengajuan',
          reference_id: p.id_pengajuan,
          icon: 'time',
          priority: 'medium'
        });
      });
      
      // 4. Presensi yang perlu perhatian (validasi ditolak)
      const [presensiDitolak] = await db.query(`
        SELECT 
          id_presensi,
          tanggal,
          status_validasi_masuk,
          status_validasi_pulang,
          catatan_validasi_masuk,
          catatan_validasi_pulang,
          waktu_validasi_masuk,
          waktu_validasi_pulang
        FROM presensi 
        WHERE id_user = ? 
        AND (status_validasi_masuk = 'ditolak' OR status_validasi_pulang = 'ditolak')
        AND tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY tanggal DESC
      `, [user_id]);
      
      presensiDitolak.forEach(p => {
        const ditolak = [];
        const catatan = [];
        const waktu = [];
        
        if (p.status_validasi_masuk === 'ditolak') {
          ditolak.push('masuk');
          if (p.catatan_validasi_masuk) catatan.push(p.catatan_validasi_masuk);
          waktu.push(p.waktu_validasi_masuk);
        }
        if (p.status_validasi_pulang === 'ditolak') {
          ditolak.push('pulang');
          if (p.catatan_validasi_pulang) catatan.push(p.catatan_validasi_pulang);
          waktu.push(p.waktu_validasi_pulang);
        }
        
        notifications.push({
          id: `presensi-ditolak-${p.id_presensi}`,
          type: 'presensi_rejected',
          title: 'Presensi Ditolak',
          message: `Presensi ${ditolak.join(' & ')} ditolak${catatan.length > 0 ? '. ' + catatan.join(', ') : ''}`,
          time: waktu[0] || p.tanggal,
          reference_type: 'presensi',
          reference_id: p.id_presensi,
          icon: 'close-circle',
          priority: 'high'
        });
      });
    }
    
    // === NOTIFIKASI UNTUK ADMIN ===
    else if (role === 'admin') {
      
      // 1. Pengajuan yang menunggu approval (URGENT)
      const [pengajuan] = await db.query(`
        SELECT 
          p.id_pengajuan,
          p.jenis_pengajuan,
          p.tanggal_pengajuan,
          p.tanggal_mulai,
          COALESCE(pg.nama_lengkap, u.nama_lengkap, 'Pegawai Tidak Dikenal') as nama_lengkap
        FROM pengajuan p
        JOIN users u ON p.id_user = u.id_user
        LEFT JOIN pegawai pg ON u.id_user = pg.id_user
        WHERE p.status = 'menunggu'
        ORDER BY p.tanggal_pengajuan DESC
        LIMIT 50
      `);
      
      pengajuan.forEach(p => {
        // Cek apakah pengajuan urgent (hari ini atau besok)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const pengajuanDate = new Date(p.tanggal_mulai);
        
        const isUrgent = pengajuanDate <= tomorrow;
        
        notifications.push({
          id: `pengajuan-${p.id_pengajuan}`,
          type: 'pengajuan_baru',
          title: isUrgent ? '🚨 Pengajuan Urgent' : 'Pengajuan Baru',
          message: `${p.nama_lengkap} mengajukan ${p.jenis_pengajuan}${isUrgent ? ' (Hari ini/Besok)' : ''}`,
          time: p.tanggal_pengajuan,
          reference_type: 'pengajuan',
          reference_id: p.id_pengajuan,
          icon: isUrgent ? 'warning' : 'document-text',
          priority: isUrgent ? 'urgent' : 'high'
        });
      });
      
      // 2. Presensi yang perlu validasi (URGENT)
      const [presensi] = await db.query(`
        SELECT 
          pr.id_presensi,
          pr.tanggal,
          pr.jam_masuk,
          pr.jam_pulang,
          pr.status_validasi_masuk,
          pr.status_validasi_pulang,
          COALESCE(pg.nama_lengkap, u.nama_lengkap, 'Pegawai Tidak Dikenal') as nama_lengkap
        FROM presensi pr
        JOIN users u ON pr.id_user = u.id_user
        LEFT JOIN pegawai pg ON u.id_user = pg.id_user
        WHERE (pr.status_validasi_masuk = 'menunggu' OR pr.status_validasi_pulang = 'menunggu')
        AND pr.tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY pr.tanggal DESC, pr.jam_masuk DESC
        LIMIT 30
      `);
      
      presensi.forEach(p => {
        const needValidation = [];
        if (p.status_validasi_masuk === 'menunggu') needValidation.push('masuk');
        if (p.status_validasi_pulang === 'menunggu') needValidation.push('pulang');
        
        // Cek apakah validasi urgent (lebih dari 2 hari)
        const today = new Date();
        const presensiDate = new Date(p.tanggal);
        const daysDiff = Math.floor((today - presensiDate) / (1000 * 60 * 60 * 24));
        const isUrgent = daysDiff >= 2;
        
        notifications.push({
          id: `presensi-${p.id_presensi}`,
          type: 'presensi_validasi',
          title: isUrgent ? '🚨 Validasi Tertunda' : 'Presensi Perlu Validasi',
          message: `${p.nama_lengkap} - Validasi ${needValidation.join(' & ')}${isUrgent ? ` (${daysDiff} hari lalu)` : ''}`,
          time: p.tanggal,
          reference_type: 'presensi',
          reference_id: p.id_presensi,
          icon: isUrgent ? 'warning' : 'time',
          priority: isUrgent ? 'urgent' : 'high'
        });
      });
      
      // 3. Dinas yang perlu konfirmasi pegawai
      const [dinasPending] = await db.query(`
        SELECT 
          d.id_dinas,
          d.nama_kegiatan,
          d.tanggal_mulai,
          d.created_at,
          COUNT(dp.id_dinas_pegawai) as total_pegawai,
          COUNT(CASE WHEN dp.status_konfirmasi = 'pending' THEN 1 END) as pending_count
        FROM dinas d
        JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
        WHERE d.status = 'aktif'
        AND dp.status_konfirmasi = 'pending'
        GROUP BY d.id_dinas
        ORDER BY d.created_at DESC
        LIMIT 20
      `);
      
      dinasPending.forEach(d => {
        notifications.push({
          id: `dinas-pending-${d.id_dinas}`,
          type: 'dinas_pending',
          title: 'Dinas Menunggu Konfirmasi',
          message: `${d.nama_kegiatan} - ${d.pending_count} pegawai belum konfirmasi`,
          time: d.created_at,
          reference_type: 'dinas',
          reference_id: d.id_dinas,
          icon: 'people',
          priority: 'medium'
        });
      });
      
      // 4. Summary harian untuk admin
      const [dailySummary] = await db.query(`
        SELECT 
          COUNT(CASE WHEN p.status = 'menunggu' THEN 1 END) as pengajuan_menunggu,
          COUNT(CASE WHEN pr.status_validasi_masuk = 'menunggu' OR pr.status_validasi_pulang = 'menunggu' THEN 1 END) as presensi_menunggu
        FROM pengajuan p, presensi pr
        WHERE DATE(p.tanggal_pengajuan) = CURDATE()
        OR DATE(pr.tanggal) = CURDATE()
      `);
      
      if (dailySummary.length > 0 && (dailySummary[0].pengajuan_menunggu > 0 || dailySummary[0].presensi_menunggu > 0)) {
        notifications.push({
          id: `daily-summary-${new Date().toISOString().split('T')[0]}`,
          type: 'daily_summary',
          title: 'Ringkasan Hari Ini',
          message: `${dailySummary[0].pengajuan_menunggu} pengajuan, ${dailySummary[0].presensi_menunggu} validasi menunggu`,
          time: new Date().toISOString(),
          reference_type: 'summary',
          reference_id: null,
          icon: 'stats-chart',
          priority: 'low'
        });
      }
    }
    
    // Sort by priority and time
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    notifications.sort((a, b) => {
      // First sort by priority
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then sort by time (newest first)
      return new Date(b.time) - new Date(a.time);
    });
    
    // Add read status (default unread)
    notifications.forEach(notif => {
      notif.is_read = false;
      notif.created_at = notif.time;
    });
    
    console.log(`[INBOX] Found ${notifications.length} notifications for ${role}`);
    
    res.json({ 
      success: true, 
      data: notifications,
      count: notifications.length,
      unread_count: notifications.filter(n => !n.is_read).length
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
 * Get jumlah notifikasi yang belum dibaca
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { user_id, role } = req.query;
    
    if (!user_id || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id dan role wajib diisi' 
      });
    }
    
    const db = await getConnection();
    let unreadCount = 0;
    
    if (role === 'pegawai') {
      // Count pengajuan yang sudah disetujui/ditolak (7 hari terakhir)
      const [pengajuan] = await db.query(`
        SELECT COUNT(*) as count
        FROM pengajuan 
        WHERE id_user = ? 
        AND status IN ('disetujui', 'ditolak')
        AND waktu_persetujuan >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `, [user_id]);
      
      // Count dinas pending
      const [dinas] = await db.query(`
        SELECT COUNT(*) as count
        FROM dinas_pegawai dp
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.id_user = ? 
        AND dp.status_konfirmasi = 'pending'
      `, [user_id]);
      
      // Count presensi ditolak
      const [presensi] = await db.query(`
        SELECT COUNT(*) as count
        FROM presensi 
        WHERE id_user = ? 
        AND (status_validasi_masuk = 'ditolak' OR status_validasi_pulang = 'ditolak')
        AND tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `, [user_id]);
      
      unreadCount = (pengajuan[0]?.count || 0) + (dinas[0]?.count || 0) + (presensi[0]?.count || 0);
      
    } else if (role === 'admin') {
      // Count pengajuan menunggu
      const [pengajuan] = await db.query(`
        SELECT COUNT(*) as count
        FROM pengajuan 
        WHERE status = 'menunggu'
      `);
      
      // Count presensi menunggu validasi
      const [presensi] = await db.query(`
        SELECT COUNT(*) as count
        FROM presensi 
        WHERE (status_validasi_masuk = 'menunggu' OR status_validasi_pulang = 'menunggu')
        AND tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `);
      
      unreadCount = (pengajuan[0]?.count || 0) + (presensi[0]?.count || 0);
    }
    
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

module.exports = router;