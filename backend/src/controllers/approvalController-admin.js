const { getConnection } = require('../config/database');
const PushNotificationService = require('../services/pushNotificationService');

const getApproval = async (req, res) => {
  try {
    const db = await getConnection();

    // Get pengajuan from pegawai only (exclude admin) - ONLY PENDING status
    const [results] = await db.execute(`
      SELECT 
        pg.id_pengajuan,
        pg.jenis_pengajuan,
        pg.tanggal_mulai,
        pg.tanggal_selesai,
        pg.jam_mulai,
        pg.jam_selesai,
        pg.alasan_text,
        pg.lokasi_dinas,
        pg.status,
        pg.tanggal_pengajuan,
        p.nama_lengkap,
        p.nip
      FROM pengajuan pg
      LEFT JOIN users u ON pg.id_user = u.id_user
      LEFT JOIN pegawai p ON u.id_user = p.id_user
      WHERE u.role = 'pegawai' 
      AND pg.status = 'pending'
      AND pg.jenis_pengajuan NOT IN ('dinas_lokal', 'dinas_luar_kota', 'dinas_luar_negeri')
      ORDER BY pg.tanggal_pengajuan DESC
    `);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const updateApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, keterangan_admin } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.json({ success: false, message: 'Status tidak valid' });
    }

    const db = await getConnection();

    // Ambil data pengajuan sebelum update
    const [pengajuanData] = await db.execute(`
      SELECT 
        pg.id_pengajuan,
        pg.id_user,
        pg.jenis_pengajuan,
        u.nama_lengkap
      FROM pengajuan pg
      JOIN users u ON pg.id_user = u.id_user
      WHERE pg.id_pengajuan = ?
    `, [id]);

    if (pengajuanData.length === 0) {
      return res.json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

    const pengajuan = pengajuanData[0];

    // Update status pengajuan
    const [result] = await db.execute(`
      UPDATE pengajuan 
      SET status = ?, keterangan_admin = ?, tanggal_approval = NOW()
      WHERE id_pengajuan = ?
    `, [status, keterangan_admin || null, id]);

    if (result.affectedRows > 0) {
      /* ========================================
         NOTIFIKASI: PENGAJUAN DISETUJUI/DITOLAK
         - Dikirim ke: Pegawai yang mengajukan
         - Type: 'pengajuan_approved' | 'pengajuan_rejected'
         - Icon: ✓ (approved) | ✗ (rejected)
         - Routing: Detail Pengajuan
      ======================================== */
      const isApproved = status === 'approved';
      const statusText = isApproved ? 'disetujui' : 'ditolak';
      const icon = isApproved ? '✓' : '✗';
      const title = `${icon} Pengajuan ${isApproved ? 'Disetujui' : 'Ditolak'}`;
      const message = `Pengajuan ${pengajuan.jenis_pengajuan} Anda telah ${statusText}${keterangan_admin ? '. Catatan: ' + keterangan_admin : ''}`;
      
      PushNotificationService.sendToUser(
        pengajuan.id_user,
        title,
        message,
        'approval',
        {
          type: isApproved ? 'pengajuan_approved' : 'pengajuan_rejected',
          reference_type: 'pengajuan',
          reference_id: parseInt(id),
          jenis_pengajuan: pengajuan.jenis_pengajuan,
          status: status
        }
      ).catch(error => {
        console.error('[PUSH] Failed to send notification:', error);
      });

      res.json({
        success: true,
        message: `Pengajuan berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`
      });
    } else {
      res.json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }

  } catch (error) {
    console.error('Update approval error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

module.exports = { getApproval, updateApproval };
