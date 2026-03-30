const { getConnection } = require('../config/database');

const getTracking = async (req, res) => {
  try {
    const db = await getConnection();

    // Cek hari libur
    const [hariLiburRows] = await db.execute(`
      SELECT nama_libur FROM hari_libur WHERE tanggal = CURDATE() AND is_active = 1 LIMIT 1
    `);
    const hariIni = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()];
    const [jamKerjaRows] = await db.execute(`
      SELECT is_kerja FROM jam_kerja_hari WHERE hari = ? LIMIT 1
    `, [hariIni]);
    const isKalenderLibur = hariLiburRows.length > 0;
    const isWeekend = jamKerjaRows.length > 0 && !jamKerjaRows[0].is_kerja;
    const isHariLibur = isKalenderLibur || isWeekend;
    const namaLibur = isKalenderLibur ? hariLiburRows[0].nama_libur : 'Libur Weekend';

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
        END AS status,
        CASE 
          WHEN d.id_dinas IS NOT NULL AND dp.status_konfirmasi IN ('konfirmasi', 'disetujui', 'approved') THEN 'dinas'
          ELSE 'kantor'
        END AS jenis_presensi,
        d.id_dinas AS dinas_id
      FROM pegawai p
      INNER JOIN users u ON p.id_user = u.id_user
      LEFT JOIN lokasi_realtime lr ON p.id_user = lr.id_user
      LEFT JOIN presensi pr ON p.id_user = pr.id_user AND pr.tanggal = CURDATE()
      LEFT JOIN jam_kerja_hari jk ON jk.hari = DAYNAME(CURDATE())
      LEFT JOIN dinas_pegawai dp ON p.id_user = dp.id_user AND dp.status_konfirmasi IN ('konfirmasi', 'disetujui', 'approved')
      LEFT JOIN dinas d ON dp.id_dinas = d.id_dinas 
        AND CURDATE() BETWEEN d.tanggal_mulai AND d.tanggal_selesai
        AND d.status IN ('aktif', 'active')
      WHERE u.role = 'pegawai' AND p.status_pegawai = 'Aktif'
      ORDER BY 
        CASE WHEN pr.jam_masuk IS NULL THEN 1 ELSE 0 END,
        pr.jam_masuk DESC
    `);

    // Hitung jarak dari kantor terdekat untuk setiap pegawai
    const [lokasiKantor] = await db.execute(`
      SELECT id_lokasi_kantor as id, nama_lokasi, lintang, bujur, radius FROM lokasi_kantor WHERE is_active = 1
    `);

    // Get lokasi dinas untuk pegawai yang sedang dinas
    const [lokasiDinas] = await db.execute(`
      SELECT 
        dl.id_dinas,
        lk.id_lokasi_kantor as id,
        lk.nama_lokasi,
        lk.lintang,
        lk.bujur,
        lk.radius
      FROM dinas_lokasi dl
      JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id_lokasi_kantor
      WHERE lk.is_active = 1
    `);

    const pegawaiWithDistance = results.map(pegawai => {
      console.log(`🔍 Processing pegawai: ${pegawai.nama_lengkap}, jenis_presensi: ${pegawai.jenis_presensi}, dinas_id: ${pegawai.dinas_id}`);
      
      let jarakTerdekat = null;
      let kantorTerdekat = null;
      let jarakDariLokasiDinas = null;
      let lokasiDinasTerdekat = null;
      let totalLokasiDinas = 0;
      let lokasiDalamRadius = 0;
      
      if (pegawai.latitude && pegawai.longitude) {
        if (pegawai.jenis_presensi === 'dinas' && pegawai.dinas_id) {
          // Hitung jarak ke lokasi dinas
          const lokasiDinasItem = lokasiDinas.filter(ld => ld.id_dinas === pegawai.dinas_id);
          totalLokasiDinas = lokasiDinasItem.length;
          
          lokasiDinasItem.forEach(lokasi => {
            const jarak = hitungJarak(
              pegawai.latitude,
              pegawai.longitude,
              lokasi.lintang,
              lokasi.bujur
            );
            
            if (jarakDariLokasiDinas === null || jarak < jarakDariLokasiDinas) {
              jarakDariLokasiDinas = jarak;
              lokasiDinasTerdekat = lokasi;
            }
            
            // Hitung berapa lokasi yang dalam radius
            if (jarak <= (lokasi.radius || 50)) {
              lokasiDalamRadius++;
            }
          });
        } else {
          // Hitung jarak ke kantor terdekat (untuk pegawai kantor)
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
      }
      
      return {
        ...pegawai,
        is_online: pegawai.last_update
          ? (new Date() - new Date(pegawai.last_update)) <= 5 * 60 * 1000
          : false,
        jarak_dari_kantor: jarakTerdekat,
        kantor_terdekat: kantorTerdekat?.nama_lokasi,
        radius_kantor: kantorTerdekat?.radius || 50,
        jenis_presensi: pegawai.jenis_presensi || 'kantor',
        dinas_id: pegawai.dinas_id || null,
        // Data untuk dinas
        jarak_dari_lokasi_dinas: jarakDariLokasiDinas,
        lokasi_dinas_terdekat: lokasiDinasTerdekat?.nama_lokasi,
        total_lokasi_dinas: totalLokasiDinas,
        lokasi_dalam_radius: lokasiDalamRadius
      };
    });

    res.json({
      success: true,
      is_hari_libur: isHariLibur,
      nama_libur: isHariLibur ? namaLibur : null,
      data: pegawaiWithDistance,
      summary: {
        total: pegawaiWithDistance.length,
        online: pegawaiWithDistance.filter(p => p.is_online).length,
        kantor: pegawaiWithDistance.filter(p => p.jenis_presensi === 'kantor').length,
        dinas: pegawaiWithDistance.filter(p => p.jenis_presensi === 'dinas').length,
        sudah_absen: pegawaiWithDistance.filter(p => p.jam_masuk).length,
        belum_absen: isHariLibur ? 0 : pegawaiWithDistance.filter(p => !p.jam_masuk).length,
      }
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

const heartbeat = async (req, res) => {
  try {
    const { id_user } = req.body;
    if (!id_user) return res.json({ success: false, message: 'id_user diperlukan' });

    const db = await getConnection();

    // Update last_update di lokasi_realtime sebagai penanda online
    // Jika belum ada record, insert dengan koordinat 0 (akan diupdate saat update-location)
    await db.execute(`
      INSERT INTO lokasi_realtime (id_user, lintang, bujur, last_update)
      VALUES (?, 0, 0, NOW())
      ON DUPLICATE KEY UPDATE last_update = NOW()
    `, [id_user]);

    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.json({ success: false, message: 'Gagal update heartbeat' });
  }
};

module.exports = { getTracking, updateLocation, heartbeat };
