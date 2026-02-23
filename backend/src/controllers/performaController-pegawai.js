const { getConnection } = require('../config/database');

// Get statistik performa pegawai
exports.getPerforma = async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    console.log('📊 Get Performa - User ID:', userId);
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const db = await getConnection();

    // 1. Statistik Bulan Ini - Gabungan dari presensi dan absen_dinas
    const [statsRows] = await db.execute(`
      SELECT 
        COUNT(*) as total_hari,
        SUM(CASE WHEN LOWER(status) IN ('hadir', 'tepat waktu') THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN LOWER(status) = 'terlambat' THEN 1 ELSE 0 END) as terlambat,
        SUM(CASE WHEN LOWER(status) = 'izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN LOWER(status) = 'sakit' THEN 1 ELSE 0 END) as sakit,
        SUM(CASE WHEN LOWER(status) = 'cuti' THEN 1 ELSE 0 END) as cuti,
        SUM(CASE WHEN LOWER(status) IN ('tidak hadir', 'alpha') THEN 1 ELSE 0 END) as alpha
      FROM (
        SELECT status FROM presensi 
        WHERE id_user = ? 
          AND MONTH(tanggal) = MONTH(CURDATE())
          AND YEAR(tanggal) = YEAR(CURDATE())
        UNION ALL
        SELECT status FROM absen_dinas
        WHERE id_user = ?
          AND MONTH(tanggal_absen) = MONTH(CURDATE())
          AND YEAR(tanggal_absen) = YEAR(CURDATE())
      ) AS combined_presensi
    `, [userId, userId]);
    
    console.log('📈 Stats Presensi:', statsRows[0]);
    
    // Debug: Lihat data asli dari presensi
    const [rawPresensi] = await db.execute(`
      SELECT DATE(tanggal) as tanggal, status
      FROM presensi
      WHERE id_user = ? 
        AND MONTH(tanggal) = MONTH(CURDATE())
        AND YEAR(tanggal) = YEAR(CURDATE())
      ORDER BY tanggal DESC
    `, [userId]);
    
    // Debug: Lihat data asli dari absen_dinas
    const [rawDinas] = await db.execute(`
      SELECT tanggal_absen, status
      FROM absen_dinas
      WHERE id_user = ?
        AND MONTH(tanggal_absen) = MONTH(CURDATE())
        AND YEAR(tanggal_absen) = YEAR(CURDATE())
      ORDER BY tanggal_absen DESC
    `, [userId]);
    
    console.log('🔍 Raw Presensi Data:', rawPresensi);
    console.log('🔍 Raw Dinas Data:', rawDinas);

    // 2. Total Jam Kerja - Gabungan dari presensi dan absen_dinas
    const [jamKerjaRows] = await db.execute(`
      SELECT 
        SUM(total_menit) as total_menit
      FROM (
        SELECT TIMESTAMPDIFF(MINUTE, jam_masuk, jam_pulang) as total_menit
        FROM presensi
        WHERE id_user = ? 
          AND jam_pulang IS NOT NULL
          AND MONTH(tanggal) = MONTH(CURDATE())
          AND YEAR(tanggal) = YEAR(CURDATE())
        UNION ALL
        SELECT TIMESTAMPDIFF(MINUTE, jam_masuk, jam_pulang) as total_menit
        FROM absen_dinas
        WHERE id_user = ?
          AND jam_pulang IS NOT NULL
          AND MONTH(tanggal_absen) = MONTH(CURDATE())
          AND YEAR(tanggal_absen) = YEAR(CURDATE())
      ) AS combined_jam
    `, [userId, userId]);
    
    console.log('⏱️  Total Menit Kerja:', jamKerjaRows[0]);

    // 3. Pengajuan
    const [pengajuanRows] = await db.execute(`
      SELECT 
        jenis_pengajuan,
        COUNT(*) as total
      FROM pengajuan
      WHERE id_user = ?
        AND status = 'disetujui'
        AND YEAR(tanggal_pengajuan) = YEAR(CURDATE())
      GROUP BY jenis_pengajuan
    `, [userId]);
    
    console.log('📝 Pengajuan Data:', pengajuanRows);

    // Hitung metrik
    const stats = statsRows[0];
    const hadir = parseInt(stats.hadir) || 0;
    const terlambat = parseInt(stats.terlambat) || 0;
    const izin = parseInt(stats.izin) || 0;
    const sakit = parseInt(stats.sakit) || 0;
    const cuti = parseInt(stats.cuti) || 0;
    const alpha = parseInt(stats.alpha) || 0;
    
    const totalMenit = parseInt(jamKerjaRows[0].total_menit) || 0;
    const totalJam = Math.floor(totalMenit / 60);
    
    // Hitung hari kerja REAL bulan ini dari database
    const [hariKerjaResult] = await db.execute(`
      SELECT COUNT(*) as total_hari_kerja
      FROM (
        SELECT DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL seq DAY) as tanggal
        FROM (
          SELECT 0 seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
          UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
          UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
          UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
          UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
          UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
          UNION SELECT 30
        ) days
      ) calendar
      WHERE MONTH(tanggal) = MONTH(CURDATE())
        AND YEAR(tanggal) = YEAR(CURDATE())
        AND (
          SELECT is_kerja FROM jam_kerja_hari 
          WHERE hari = CASE DAYOFWEEK(tanggal)
            WHEN 1 THEN 'Minggu'
            WHEN 2 THEN 'Senin'
            WHEN 3 THEN 'Selasa'
            WHEN 4 THEN 'Rabu'
            WHEN 5 THEN 'Kamis'
            WHEN 6 THEN 'Jumat'
            WHEN 7 THEN 'Sabtu'
          END
        ) = 1
        AND NOT EXISTS (
          SELECT 1 FROM hari_libur 
          WHERE tanggal = calendar.tanggal AND is_active = 1
        )
    `);
    
    const hariKerjaBulan = hariKerjaResult[0].total_hari_kerja || 22;
    
    // Hitung target jam kerja dari database (SUM jam kerja per hari)
    const [targetJamResult] = await db.execute(`
      SELECT 
        SUM(TIMESTAMPDIFF(HOUR, jam_masuk, jam_pulang)) as total_jam_target
      FROM (
        SELECT 
          calendar.tanggal,
          jkh.jam_masuk,
          jkh.jam_pulang
        FROM (
          SELECT DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL seq DAY) as tanggal
          FROM (
            SELECT 0 seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
            UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
            UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
            UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
            UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
            UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
            UNION SELECT 30
          ) days
        ) calendar
        JOIN jam_kerja_hari jkh ON jkh.hari = CASE DAYOFWEEK(calendar.tanggal)
          WHEN 1 THEN 'Minggu'
          WHEN 2 THEN 'Senin'
          WHEN 3 THEN 'Selasa'
          WHEN 4 THEN 'Rabu'
          WHEN 5 THEN 'Kamis'
          WHEN 6 THEN 'Jumat'
          WHEN 7 THEN 'Sabtu'
        END
        WHERE MONTH(calendar.tanggal) = MONTH(CURDATE())
          AND YEAR(calendar.tanggal) = YEAR(CURDATE())
          AND jkh.is_kerja = 1
          AND NOT EXISTS (
            SELECT 1 FROM hari_libur 
            WHERE tanggal = calendar.tanggal AND is_active = 1
          )
      ) AS hari_kerja_detail
    `);
    
    const jamKerjaBulan = targetJamResult[0].total_jam_target || (hariKerjaBulan * 8);
    
    console.log('📅 Hari Kerja Bulan Ini:', hariKerjaBulan);
    console.log('⏰ Target Jam Kerja Bulan Ini:', jamKerjaBulan);
    
    // Hitung persentase
    const tingkatKehadiran = stats.total_hari > 0 
      ? Math.round(((hadir + terlambat) / hariKerjaBulan) * 100) 
      : 0;
    
    const ketepatanWaktu = (hadir + terlambat) > 0
      ? Math.round((hadir / (hadir + terlambat)) * 100)
      : 0;
    
    const persentaseJamKerja = Math.round((totalJam / jamKerjaBulan) * 100);

    // Hitung Skor Performa (0-100)
    const skorPerforma = Math.round(
      (tingkatKehadiran * 0.5) +
      (ketepatanWaktu * 0.3) +
      (Math.min(persentaseJamKerja, 100) * 0.2)
    );

    // Kategori
    let kategori = 'Perlu Perbaikan';
    if (skorPerforma >= 90) kategori = 'Sangat Baik';
    else if (skorPerforma >= 75) kategori = 'Baik';
    else if (skorPerforma >= 60) kategori = 'Cukup';

    // Pencapaian
    const pencapaian = [];
    if (alpha === 0) pencapaian.push('Tidak pernah alpha bulan ini');
    if (tingkatKehadiran >= 90) pencapaian.push('Kehadiran di atas 90%');
    if (terlambat > 0) pencapaian.push(`Terlambat ${terlambat} kali`);

    // Format pengajuan
    const pengajuan = {
      lembur: 0,
      izin: 0,
      cuti: 0
    };
    
    pengajuanRows.forEach(row => {
      console.log('🔍 Processing:', row.jenis_pengajuan, '=', row.total);
      
      if (row.jenis_pengajuan === 'lembur') {
        pengajuan.lembur = row.total;
      } else if (row.jenis_pengajuan === 'izin_datang_terlambat' || row.jenis_pengajuan === 'izin_pulang_cepat') {
        pengajuan.izin += row.total;
      } else if (row.jenis_pengajuan === 'cuti_sakit' || row.jenis_pengajuan === 'cuti_alasan_penting' || row.jenis_pengajuan === 'cuti_tahunan') {
        pengajuan.cuti += row.total;
      }
    });
    
    console.log('✅ Final Pengajuan:', pengajuan);

    res.json({
      success: true,
      data: {
        skor_performa: skorPerforma,
        kategori: kategori,
        statistik: {
          total_jam_kerja: totalJam,
          target_jam_kerja: jamKerjaBulan,
          persentase_jam_kerja: persentaseJamKerja,
          tingkat_kehadiran: tingkatKehadiran,
          hari_hadir: hadir + terlambat,
          target_hari_kerja: hariKerjaBulan,
          ketepatan_waktu: ketepatanWaktu,
          hari_tepat_waktu: hadir,
          total_hari_masuk: hadir + terlambat
        },
        rincian: {
          hadir: hadir,
          terlambat: terlambat,
          izin: izin,
          sakit: sakit,
          cuti: cuti,
          alpha: alpha
        },
        pencapaian: pencapaian,
        aktivitas: {
          lembur: pengajuan.lembur,
          izin: pengajuan.izin,
          cuti: pengajuan.cuti
        }
      }
    });

  } catch (error) {
    console.error('Error get performa:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
