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
    
    // Get today's attendance - CEK KEDUA TABEL (presensi + absen_dinas)
    const [presensiRows] = await db.execute(`
      SELECT *, 'kantor' as jenis_presensi FROM presensi 
      WHERE id_user = ? 
      AND DATE(tanggal) = CURDATE()
      ORDER BY tanggal DESC
      LIMIT 1
    `, [user_id]);
    
    const [dinasRows] = await db.execute(`
      SELECT 
        id_user,
        tanggal_absen as tanggal,
        jam_masuk,
        jam_pulang,
        status,
        status_validasi,
        'dinas' as jenis_presensi
      FROM absen_dinas 
      WHERE id_user = ? 
      AND tanggal_absen = CURDATE()
      ORDER BY tanggal_absen DESC
      LIMIT 1
    `, [user_id]);
    
    // Prioritaskan data yang ada jam_masuk
    let presensi_hari_ini = null;
    if (presensiRows[0] && presensiRows[0].jam_masuk) {
      presensi_hari_ini = presensiRows[0];
    } else if (dinasRows[0] && dinasRows[0].jam_masuk) {
      presensi_hari_ini = dinasRows[0];
    } else {
      presensi_hari_ini = presensiRows[0] || dinasRows[0] || null;
    }
    
    // Get this month's summary - GABUNGAN presensi + absen_dinas
    const [summaryRows] = await db.execute(`
      SELECT 
        (
          SELECT COUNT(*)
          FROM presensi 
          WHERE id_user = ? 
            AND MONTH(tanggal) = MONTH(CURDATE()) 
            AND YEAR(tanggal) = YEAR(CURDATE())
            AND status IN ('Hadir', 'Terlambat')
            AND jam_masuk IS NOT NULL
        ) +
        (
          SELECT COUNT(*)
          FROM absen_dinas
          WHERE id_user = ? 
            AND MONTH(tanggal_absen) = MONTH(CURDATE()) 
            AND YEAR(tanggal_absen) = YEAR(CURDATE())
            AND jam_masuk IS NOT NULL
        ) as total_hadir,
        (
          SELECT COUNT(*)
          FROM presensi 
          WHERE id_user = ? 
            AND MONTH(tanggal) = MONTH(CURDATE()) 
            AND YEAR(tanggal) = YEAR(CURDATE())
            AND status = 'Terlambat'
        ) as total_terlambat,
        (
          SELECT COUNT(*)
          FROM presensi 
          WHERE id_user = ? 
            AND MONTH(tanggal) = MONTH(CURDATE()) 
            AND YEAR(tanggal) = YEAR(CURDATE())
            AND status = 'Tidak Hadir'
        ) as total_tidak_hadir
    `, [user_id, user_id, user_id, user_id]);
    
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
        presensi_hari_ini: presensi_hari_ini,
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
