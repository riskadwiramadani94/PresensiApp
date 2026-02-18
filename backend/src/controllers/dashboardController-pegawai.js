const { getConnection } = require('../config/database');

const getDashboard = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();
    
    // Get user info
    const [userRows] = await db.execute(`
      SELECT p.*, u.email 
      FROM pegawai p 
      LEFT JOIN users u ON p.id_user = u.id_user 
      WHERE p.id_user = ?
    `, [user_id]);
    
    if (userRows.length === 0) {
      return res.json({ success: false, message: 'Pegawai tidak ditemukan' });
    }
    
    const user = userRows[0];
    
    // Get jam kerja berdasarkan hari ini
    const hariIni = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
    const [jamKerjaRows] = await db.execute(`
      SELECT jam_masuk, jam_pulang as jam_keluar 
      FROM jam_kerja_hari 
      WHERE hari = ? AND is_kerja = 1
      LIMIT 1
    `, [hariIni]);
    
    // Get today's attendance
    const [presensiRows] = await db.execute(`
      SELECT * FROM presensi 
      WHERE id_user = ? AND DATE(tanggal) = CURDATE()
    `, [user_id]);
    
    // Get this month's summary
    const [summaryRows] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN status IN ('Hadir', 'Terlambat') THEN 1 END) as total_hadir,
        COUNT(CASE WHEN status = 'Terlambat' THEN 1 END) as total_terlambat,
        COUNT(CASE WHEN status = 'Tidak Hadir' THEN 1 END) as total_tidak_hadir
      FROM presensi 
      WHERE id_user = ? 
        AND MONTH(tanggal) = MONTH(CURDATE()) 
        AND YEAR(tanggal) = YEAR(CURDATE())
    `, [user_id]);
    
    res.json({
      success: true,
      data: {
        user_info: {
          nama_lengkap: user.nama_lengkap,
          nip: user.nip,
          jenis_kelamin: user.jenis_kelamin,
          tanggal_lahir: user.tanggal_lahir,
          alamat: user.alamat,
          no_telepon: user.no_telepon,
          jabatan: user.jabatan || 'Staff',
          divisi: user.divisi || 'Umum',
          email: user.email,
          foto_profil: user.foto_profil
        },
        jam_kerja: {
          jam_masuk: jamKerjaRows[0]?.jam_masuk || '08:00',
          jam_keluar: jamKerjaRows[0]?.jam_keluar || '17:00'
        },
        presensi_hari_ini: presensiRows[0] || null,
        summary_bulan_ini: {
          total_hadir: summaryRows[0]?.total_hadir || 0,
          total_terlambat: summaryRows[0]?.total_terlambat || 0,
          total_tidak_hadir: summaryRows[0]?.total_tidak_hadir || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

module.exports = { getDashboard };
