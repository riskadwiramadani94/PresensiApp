const { getConnection } = require('../config/database');

const getTracking = async (req, res) => {
  try {
    const db = await getConnection();

    // Get all active pegawai with real-time location and attendance status
    const [results] = await db.execute(`
      SELECT 
        u.id_user,
        p.id_pegawai,
        p.nama_lengkap,
        p.nip,
        p.jabatan,
        p.divisi,
        p.foto_profil,
        pr.tanggal,
        pr.jam_masuk,
        pr.jam_pulang,
        COALESCE(lr.lintang, pr.lintang_masuk) AS latitude,
        COALESCE(lr.bujur, pr.bujur_masuk) AS longitude,
        lr.last_update,
        CASE 
          WHEN pr.jam_masuk IS NULL THEN 'Belum Absen'
          WHEN pr.jam_masuk <= jk.batas_absen THEN 'Hadir'
          WHEN pr.jam_masuk > jk.batas_absen THEN 'Terlambat'
          ELSE 'Belum Absen'
        END AS status
      FROM pegawai p
      INNER JOIN users u ON p.id_user = u.id_user
      LEFT JOIN lokasi_realtime lr ON p.id_user = lr.id_user
      LEFT JOIN presensi pr ON p.id_user = pr.id_user AND pr.tanggal = CURDATE()
      LEFT JOIN jam_kerja_hari jk ON jk.hari = DAYNAME(CURDATE())
      WHERE u.role = 'pegawai' AND p.status_pegawai = 'Aktif'
      ORDER BY 
        CASE WHEN pr.jam_masuk IS NULL THEN 1 ELSE 0 END,
        pr.jam_masuk DESC
    `);

    // Hitung jarak dari kantor terdekat untuk setiap pegawai
    const [lokasiKantor] = await db.execute(`
      SELECT id, nama_lokasi, lintang, bujur, radius FROM lokasi_kantor WHERE is_active = 1
    `);

    const pegawaiWithDistance = results.map(pegawai => {
      let jarakTerdekat = null;
      let kantorTerdekat = null;
      
      if (pegawai.latitude && pegawai.longitude && lokasiKantor.length > 0) {
        // Cari kantor terdekat
        lokasiKantor.forEach(kantor => {
          const jarak = hitungJarak(
            pegawai.latitude,
            pegawai.longitude,
            kantor.lintang,
            kantor.bujur
          );
          
          if (jarakTerdekat === null || jarak < jarakTerdekat) {
            jarakTerdekat = jarak;
            kantorTerdekat = kantor;
          }
        });
      }
      
      return {
        ...pegawai,
        jarak_dari_kantor: jarakTerdekat,
        kantor_terdekat: kantorTerdekat?.nama_lokasi,
        radius_kantor: kantorTerdekat?.radius || 50
      };
    });

    res.json({
      success: true,
      data: pegawaiWithDistance
    });

  } catch (error) {
    console.error('Tracking error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

// Fungsi hitung jarak menggunakan Haversine formula
const hitungJarak = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius bumi dalam meter
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c); // Jarak dalam meter
};

const updateLocation = async (req, res) => {
  try {
    const { id_user, latitude, longitude } = req.body;

    if (!id_user || !latitude || !longitude) {
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }

    const db = await getConnection();

    // Insert or update location
    await db.execute(`
      INSERT INTO lokasi_realtime (id_user, lintang, bujur, last_update)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        lintang = VALUES(lintang),
        bujur = VALUES(bujur),
        last_update = NOW()
    `, [id_user, latitude, longitude]);

    res.json({ success: true, message: 'Lokasi berhasil diupdate' });

  } catch (error) {
    console.error('Update location error:', error);
    res.json({ success: false, message: 'Gagal update lokasi' });
  }
};

module.exports = { getTracking, updateLocation };
