const { getConnection } = require('../config/database');

const getPengajuan = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();

    const [pengajuan] = await db.execute(`
      SELECT 
        p.*,
        u.nama_lengkap as nama_approver
      FROM pengajuan p
      LEFT JOIN users u ON p.disetujui_oleh = u.id_user
      WHERE p.id_user = ? 
      ORDER BY p.tanggal_pengajuan DESC
    `, [user_id]);

    // Format data untuk tampilan yang lebih baik
    const formattedData = pengajuan.map(item => ({
      ...item,
      jenis_pengajuan_label: getJenisPengajuanLabel(item.jenis_pengajuan),
      status_label: getStatusLabel(item.status),
      tanggal_mulai_formatted: formatDate(item.tanggal_mulai),
      tanggal_selesai_formatted: item.tanggal_selesai ? formatDate(item.tanggal_selesai) : null,
      tanggal_pengajuan_formatted: formatDateTime(item.tanggal_pengajuan)
    }));

    res.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Get pengajuan error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

// Helper functions untuk formatting
const getJenisPengajuanLabel = (jenis) => {
  const labels = {
    'izin_datang_terlambat': 'Izin Datang Terlambat',
    'izin_pulang_cepat': 'Izin Pulang Cepat',
    'cuti_sakit': 'Cuti Sakit',
    'cuti_alasan_penting': 'Cuti Alasan Penting',
    'cuti_tahunan': 'Cuti Tahunan',
    'lembur': 'Lembur'
  };
  return labels[jenis] || jenis;
};

const getStatusLabel = (status) => {
  const labels = {
    'menunggu': 'Menunggu',
    'disetujui': 'Disetujui',
    'ditolak': 'Ditolak'
  };
  return labels[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const submitPengajuan = async (req, res) => {
  try {
    const { user_id, jenis_pengajuan, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, alasan_text, dokumen_foto } = req.body;

    if (!user_id || !jenis_pengajuan || !tanggal_mulai || !alasan_text) {
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }

    const db = await getConnection();

    // Ambil id_pegawai dari tabel pegawai
    const [pegawaiResult] = await db.execute(
      'SELECT id_pegawai FROM pegawai WHERE id_user = ?',
      [user_id]
    );

    if (pegawaiResult.length === 0) {
      return res.json({ success: false, message: 'Data pegawai tidak ditemukan' });
    }

    const id_pegawai = pegawaiResult[0].id_pegawai;

    const [result] = await db.execute(`
      INSERT INTO pengajuan (
        id_user, id_pegawai, jenis_pengajuan, tanggal_mulai, tanggal_selesai, 
        jam_mulai, jam_selesai, alasan_text, dokumen_foto, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')
    `, [
      user_id, id_pegawai, jenis_pengajuan, tanggal_mulai, tanggal_selesai || null,
      jam_mulai || null, jam_selesai || null, alasan_text, dokumen_foto || null
    ]);

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Pengajuan berhasil dikirim' });
    } else {
      res.json({ success: false, message: 'Gagal mengirim pengajuan' });
    }

  } catch (error) {
    console.error('Submit pengajuan error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getIzinHariIni = async (req, res) => {
  try {
    const { user_id, tanggal } = req.query;
    
    if (!user_id || !tanggal) {
      return res.json({ success: false, message: 'user_id dan tanggal diperlukan' });
    }
    
    const db = await getConnection();
    
    const [rows] = await db.execute(`
      SELECT jenis_pengajuan, jam_mulai, status
      FROM pengajuan
      WHERE id_user = ?
        AND tanggal_mulai = ?
        AND jenis_pengajuan IN ('izin_datang_terlambat', 'izin_pulang_cepat')
        AND status = 'disetujui'
    `, [user_id, tanggal]);
    
    const result = {};
    rows.forEach(row => {
      if (row.jenis_pengajuan === 'izin_datang_terlambat') {
        result.izin_datang_terlambat = {
          jam: row.jam_mulai,
          status: row.status
        };
      } else if (row.jenis_pengajuan === 'izin_pulang_cepat') {
        result.izin_pulang_cepat = {
          jam: row.jam_mulai,
          status: row.status
        };
      }
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get izin hari ini error:', error);
    res.json({ success: false, message: error.message });
  }
};

const deletePengajuan = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.json({ success: false, message: 'ID pengajuan diperlukan' });
    }
    
    const db = await getConnection();
    
    // Cek status pengajuan
    const [pengajuan] = await db.execute(
      'SELECT status FROM pengajuan WHERE id_pengajuan = ?',
      [id]
    );
    
    if (pengajuan.length === 0) {
      return res.json({ success: false, message: 'Pengajuan tidak ditemukan' });
    }
    
    if (pengajuan[0].status !== 'menunggu') {
      return res.json({ success: false, message: 'Hanya pengajuan dengan status menunggu yang bisa dihapus' });
    }
    
    // Hapus pengajuan
    const [result] = await db.execute(
      'DELETE FROM pengajuan WHERE id_pengajuan = ?',
      [id]
    );
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Pengajuan berhasil dihapus' });
    } else {
      res.json({ success: false, message: 'Gagal menghapus pengajuan' });
    }
  } catch (error) {
    console.error('Delete pengajuan error:', error);
    res.json({ success: false, message: error.message });
  }
};

module.exports = { getPengajuan, submitPengajuan, getIzinHariIni, deletePengajuan };
