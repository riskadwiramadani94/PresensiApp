const { getConnection } = require('../config/database');

// Function to get dynamic attendance status based on current time
const getDynamicAttendanceStatus = async (userId, targetDate = null) => {
  const db = await getConnection();
  const today = targetDate || new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 8);
  
  // Get day name in Indonesian
  const dayNames = {
    'Sunday': 'Minggu',
    'Monday': 'Senin', 
    'Tuesday': 'Selasa',
    'Wednesday': 'Rabu',
    'Thursday': 'Kamis',
    'Friday': 'Jumat',
    'Saturday': 'Sabtu'
  };
  const dayName = dayNames[now.toLocaleDateString('en-US', { weekday: 'long' })];
  
  // Get work schedule for today
  const [scheduleRows] = await db.execute(
    'SELECT jam_masuk, batas_absen, jam_pulang, is_kerja FROM jam_kerja_hari WHERE hari = ?',
    [dayName]
  );
  
  // Check if today is a holiday
  const [holidayRows] = await db.execute(
    'SELECT nama_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
    [today]
  );
  
  if (holidayRows.length > 0) {
    return { status: 'Libur', isWorkDay: false, holidayName: holidayRows[0].nama_libur };
  }
  
  if (!scheduleRows.length || !scheduleRows[0].is_kerja) {
    return { status: 'Libur', isWorkDay: false };
  }
  
  const { jam_masuk, batas_absen, jam_pulang } = scheduleRows[0];
  
  // Check if already attended today
  const [attendanceRows] = await db.execute(
    'SELECT jam_masuk, status FROM presensi WHERE id_user = ? AND DATE(tanggal) = ?',
    [userId, today]
  );
  
  if (attendanceRows.length > 0) {
    // Already attended - return existing status
    return { 
      status: attendanceRows[0].status, 
      isWorkDay: true,
      hasAttended: true,
      attendanceTime: attendanceRows[0].jam_masuk
    };
  }
  
  // Not attended yet - determine dynamic status
  if (currentTime <= batas_absen) {
    return { 
      status: 'Belum Absen', 
      isWorkDay: true, 
      hasAttended: false,
      timeRemaining: batas_absen
    };
  } else {
    return { 
      status: 'Tidak Hadir', 
      isWorkDay: true, 
      hasAttended: false,
      overdueBy: currentTime
    };
  }
};

const getLaporan = async (req, res) => {
  try {
    const { type } = req.query;
    const db = await getConnection();

    // Jika tidak ada type, return statistik untuk dashboard
    if (!type) {
      // Hitung total pegawai
      const [totalAbsenRows] = await db.execute(`
        SELECT COUNT(DISTINCT p.id_pegawai) as total 
        FROM pegawai p 
        INNER JOIN users u ON p.id_user = u.id_user 
        WHERE u.role = 'pegawai' AND p.id_user IS NOT NULL
      `);
      const totalAbsen = totalAbsenRows[0].total;

      // Hitung total dinas (semua status)
      const [totalDinasRows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM pengajuan 
        WHERE jenis_pengajuan IN ('dinas_luar_kota', 'dinas_lokal', 'dinas_luar_negeri')
      `);
      const totalDinas = totalDinasRows[0].total;

      // Hitung total izin/cuti yang approved
      const [totalIzinRows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM pengajuan 
        WHERE jenis_pengajuan IN ('izin_pribadi', 'cuti_sakit', 'cuti_tahunan') 
        AND status = 'approved'
      `);
      const totalIzin = totalIzinRows[0].total;

      // Hitung total lembur yang approved
      const [totalLemburRows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM pengajuan 
        WHERE jenis_pengajuan IN ('lembur_weekday', 'lembur_weekend', 'lembur_holiday') 
        AND status = 'approved'
      `);
      const totalLembur = totalLemburRows[0].total;

      res.json({
        success: true,
        stats: {
          totalAbsen: parseInt(totalAbsen || 0),
          totalDinas: parseInt(totalDinas || 0),
          totalIzin: parseInt(totalIzin || 0),
          totalLembur: parseInt(totalLembur || 0)
        }
      });

    } else if (type === 'absen') {
      // Get all pegawai with dynamic absen summary
      const [pegawaiResults] = await db.execute(`
        SELECT 
          p.id_pegawai as id_pegawai,
          p.nama_lengkap as nama_lengkap,
          p.nip,
          CASE 
            WHEN p.foto_profil IS NOT NULL AND p.foto_profil != '' 
            THEN CONCAT('/uploads/pegawai/', p.foto_profil)
            ELSE NULL
          END as foto_profil,
          p.id_user
        FROM pegawai p
        LEFT JOIN users u ON p.id_user = u.id_user
        WHERE u.role = 'pegawai' AND p.id_user IS NOT NULL
        ORDER BY p.nama_lengkap
      `);

      const data = [];
      
      for (const pegawai of pegawaiResults) {
        // Get attendance summary with dynamic status for today
        const [summaryRows] = await db.execute(`
          SELECT 
            COUNT(CASE WHEN pr.status = 'Hadir' THEN 1 END) as hadir,
            COUNT(CASE WHEN pr.status = 'Tidak Hadir' THEN 1 END) as tidak_hadir,
            COUNT(CASE WHEN pr.status = 'Terlambat' THEN 1 END) as terlambat,
            COUNT(CASE WHEN pr.status = 'Izin' THEN 1 END) as izin,
            COUNT(CASE WHEN pr.status = 'Sakit' THEN 1 END) as sakit,
            COUNT(CASE WHEN pr.status = 'Cuti' THEN 1 END) as cuti,
            COUNT(CASE WHEN pr.status = 'Pulang Cepat' THEN 1 END) as pulang_cepat,
            COUNT(CASE WHEN pr.status = 'Dinas Luar/ Perjalanan Dinas' THEN 1 END) as dinas_luar,
            COUNT(CASE WHEN pr.status = 'Mangkir/ Alpha' THEN 1 END) as mangkir
          FROM presensi pr
          WHERE pr.id_user = ?
        `, [pegawai.id_user]);
        
        const summary = summaryRows[0];
        
        // Count days on dinas (from dinas_pegawai table)
        const [dinasCountRows] = await db.execute(`
          SELECT COUNT(DISTINCT DATE(calendar.tanggal)) as dinas_count
          FROM dinas_pegawai dp
          JOIN dinas d ON dp.id_dinas = d.id_dinas
          CROSS JOIN (
            SELECT CURDATE() - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as tanggal
            FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS b
            CROSS JOIN (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS c
          ) calendar
          LEFT JOIN presensi pr ON pr.id_user = dp.id_user AND DATE(pr.tanggal) = DATE(calendar.tanggal)
          WHERE dp.id_user = ?
          AND DATE(calendar.tanggal) BETWEEN DATE(d.tanggal_mulai) AND DATE(d.tanggal_selesai)
          AND pr.id_presensi IS NULL
        `, [pegawai.id_user]);
        
        const dinasCount = dinasCountRows[0]?.dinas_count || 0;
        
        // Get dynamic status for today
        const todayStatus = await getDynamicAttendanceStatus(pegawai.id_user);
        
        // Adjust counts based on today's dynamic status
        let adjustedSummary = {
          'Hadir': parseInt(summary.hadir || 0),
          'Tidak Hadir': parseInt(summary.tidak_hadir || 0),
          'Terlambat': parseInt(summary.terlambat || 0),
          'Izin': parseInt(summary.izin || 0),
          'Sakit': parseInt(summary.sakit || 0),
          'Cuti': parseInt(summary.cuti || 0),
          'Pulang Cepat': parseInt(summary.pulang_cepat || 0),
          'Dinas Luar/ Perjalanan Dinas': parseInt(summary.dinas_luar || 0),
          'Dinas': parseInt(dinasCount),
          'Mangkir/ Alpha': parseInt(summary.mangkir || 0)
        };
        
        // Add today's dynamic status if it's a work day and not attended yet
        if (todayStatus.isWorkDay && !todayStatus.hasAttended) {
          if (todayStatus.status === 'Tidak Hadir') {
            adjustedSummary['Tidak Hadir'] += 1;
          }
          // 'Belum Absen' is shown in real-time but not counted in summary
        }
        
        data.push({
          id_pegawai: parseInt(pegawai.id_pegawai),
          nama_lengkap: pegawai.nama_lengkap,
          nip: pegawai.nip,
          foto_profil: pegawai.foto_profil,
          summary: adjustedSummary,
          today_status: todayStatus.status // Add current status for real-time display
        });
      }

      res.json({
        success: true,
        data: data
      });

    } else if (type === 'dinas') {
      // Get all dinas data with search and date filter
      let query = `
        SELECT 
          peng.id_pengajuan as id,
          p.nama_lengkap,
          p.nip,
          p.jabatan,
          p.foto_profil,
          peng.jenis_pengajuan,
          peng.tanggal_mulai,
          peng.tanggal_selesai,
          peng.lokasi_dinas,
          peng.status
        FROM pengajuan peng
        INNER JOIN pegawai p ON peng.id_pegawai = p.id_pegawai
        WHERE peng.jenis_pengajuan IN ('dinas_luar_kota', 'dinas_lokal', 'dinas_luar_negeri')
      `;
      
      const params = [];
      
      // Add date filter if provided
      if (req.query.date) {
        query += ` AND peng.tanggal_mulai <= ? AND peng.tanggal_selesai >= ?`;
        params.push(req.query.date, req.query.date);
      }
      
      // Add search filter if provided
      if (req.query.search) {
        query += ` AND (p.nama_lengkap LIKE ? OR peng.jenis_pengajuan LIKE ? OR peng.lokasi_dinas LIKE ?)`;
        const searchTerm = `%${req.query.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ` ORDER BY peng.tanggal_mulai DESC`;
      
      const [results] = await db.execute(query, params);
      
      const data = results.map(row => ({
        id: parseInt(row.id),
        nama_lengkap: row.nama_lengkap,
        nip: row.nip,
        jabatan: row.jabatan,
        foto_profil: row.foto_profil,
        jenis_pengajuan: row.jenis_pengajuan,
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        lokasi_dinas: row.lokasi_dinas,
        status: row.status
      }));
      
      res.json({
        success: true,
        data: data
      });

    } else if (type === 'izin') {
      // Get all izin/cuti data
      const [results] = await db.execute(`
        SELECT 
          peng.id_pengajuan as id,
          p.nama_lengkap,
          p.nip,
          p.jabatan,
          p.foto_profil,
          peng.jenis_pengajuan,
          peng.tanggal_mulai,
          peng.tanggal_selesai,
          peng.alasan_text,
          peng.status
        FROM pengajuan peng
        INNER JOIN pegawai p ON peng.id_pegawai = p.id_pegawai
        WHERE peng.jenis_pengajuan IN ('izin_pribadi', 'cuti_sakit', 'cuti_tahunan')
        ORDER BY peng.tanggal_mulai DESC
      `);
      
      const data = results.map(row => ({
        id: parseInt(row.id),
        nama_lengkap: row.nama_lengkap,
        nip: row.nip,
        jabatan: row.jabatan,
        foto_profil: row.foto_profil,
        jenis_pengajuan: row.jenis_pengajuan,
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        alasan_text: row.alasan_text,
        status: row.status
      }));
      
      res.json({
        success: true,
        data: data
      });

    } else if (type === 'lembur') {
      // Get all lembur data
      const [results] = await db.execute(`
        SELECT 
          peng.id_pengajuan as id,
          p.nama_lengkap,
          p.nip,
          p.jabatan,
          p.foto_profil,
          peng.jenis_pengajuan,
          peng.tanggal_mulai,
          peng.jam_mulai,
          peng.jam_selesai,
          peng.alasan_text,
          peng.status
        FROM pengajuan peng
        INNER JOIN pegawai p ON peng.id_pegawai = p.id_pegawai
        WHERE peng.jenis_pengajuan IN ('lembur_weekday', 'lembur_weekend', 'lembur_holiday')
        ORDER BY peng.tanggal_mulai DESC
      `);
      
      const data = results.map(row => ({
        id: parseInt(row.id),
        nama_lengkap: row.nama_lengkap,
        nip: row.nip,
        jabatan: row.jabatan,
        foto_profil: row.foto_profil,
        jenis_pengajuan: row.jenis_pengajuan,
        tanggal_mulai: row.tanggal_mulai,
        jam_mulai: row.jam_mulai,
        jam_selesai: row.jam_selesai,
        alasan_text: row.alasan_text,
        status: row.status
      }));
      
      res.json({
        success: true,
        data: data
      });

    } else {
      res.json({ success: false, message: 'Invalid type parameter' });
    }

  } catch (error) {
    console.error('Laporan error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getDetailAbsenPegawai = async (req, res) => {
  try {
    const { id } = req.params;
    const { bulan = new Date().getMonth() + 1, tahun = new Date().getFullYear() } = req.query;
    
    if (!id) {
      return res.json({ success: false, message: 'ID pegawai diperlukan' });
    }
    
    const db = await getConnection();
    
    // Ambil data pegawai
    const [pegawaiRows] = await db.execute('SELECT p.nama_lengkap, p.nip, p.id_user FROM pegawai p WHERE p.id_pegawai = ?', [id]);
    const pegawai = pegawaiRows[0];
    
    if (!pegawai) {
      return res.json({ success: false, message: 'Pegawai tidak ditemukan' });
    }
    
    const user_id = pegawai.id_user;
    
    // Generate semua tanggal dalam bulan
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
    const endDate = new Date(tahun, bulan, 0).toISOString().split('T')[0];
    
    const absenData = [];
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get day name
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = dayNames[currentDate.getDay()];
      
      // Check if it's a holiday from hari_libur (PRIORITY 1)
      const [hariLiburRows] = await db.execute(
        'SELECT nama_libur FROM hari_libur WHERE tanggal = ? AND is_active = 1',
        [dateStr]
      );
      const isHoliday = hariLiburRows.length > 0;
      
      // Check if it's a work day from jam_kerja_hari (PRIORITY 2)
      const [jamKerjaRows] = await db.execute(
        'SELECT is_kerja, jam_masuk, jam_pulang FROM jam_kerja_hari WHERE hari = ?',
        [dayName]
      );
      const isWorkDay = jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1;
      
      // Cek apakah sedang dinas
      const [dinasRows] = await db.execute(`
        SELECT d.nama_kegiatan, d.tanggal_mulai, d.tanggal_selesai
        FROM dinas_pegawai dp
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.id_user = ?
        AND ? BETWEEN DATE(d.tanggal_mulai) AND DATE(d.tanggal_selesai)
        LIMIT 1
      `, [user_id, dateStr]);
      const dinas = dinasRows[0];
      
      // Cek presensi normal
      const [presensiRows] = await db.execute(`
        SELECT tanggal, jam_masuk, jam_pulang, status, alasan_luar_lokasi as keterangan
        FROM presensi 
        WHERE id_user = ? AND tanggal = ?
      `, [user_id, dateStr]);
      const presensi = presensiRows[0];
      
      // PRIORITY 1: Hari libur nasional
      if (isHoliday) {
        absenData.push({
          tanggal: dateStr,
          status: 'Libur',
          jam_masuk: null,
          jam_keluar: null,
          keterangan: hariLiburRows[0].nama_libur
        });
      }
      // PRIORITY 2: is_kerja = 0 (hari libur setting)
      else if (!isWorkDay) {
        absenData.push({
          tanggal: dateStr,
          status: 'Libur',
          jam_masuk: null,
          jam_keluar: null,
          keterangan: `Hari ${dayName}`
        });
      }
      // PRIORITY 3: is_kerja = 1 (hari kerja)
      else if (presensi) {
        // Ada absen kantor normal
        absenData.push({
          tanggal: presensi.tanggal,
          status: presensi.status,
          jam_masuk: presensi.jam_masuk,
          jam_keluar: presensi.jam_pulang,
          keterangan: presensi.keterangan || 'Absen normal'
        });
      } else if (dinas) {
        // Sedang dinas - tampilkan status Dinas
        const startDate = new Date(dinas.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric' });
        const endDate = new Date(dinas.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const keterangan = `${dinas.nama_kegiatan} (${startDate}-${endDate})`;
        
        absenData.push({
          tanggal: dateStr,
          status: 'Dinas',
          jam_masuk: null,
          jam_keluar: null,
          keterangan: keterangan
        });
      } else {
        // Tidak ada data absen dan tidak dinas
        absenData.push({
          tanggal: dateStr,
          status: 'Tidak Hadir',
          jam_masuk: null,
          jam_keluar: null,
          keterangan: 'Tidak ada data absen'
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json({
      success: true,
      pegawai: pegawai,
      absen: absenData
    });
    
  } catch (error) {
    console.error('Detail absen pegawai error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

// Detail Laporan - GET detail by type and id
const getDetailLaporan = async (req, res) => {
  try {
    const { type = 'absen', id, date, start_date, end_date } = req.query;
    const db = await getConnection();
    
    // Jika ada ID, ambil detail single record
    if (id && type === 'dinas') {
      const [rows] = await db.execute(`
        SELECT 
          peng.id_pengajuan,
          p.nama_lengkap,
          p.nip,
          p.foto_profil,
          p.jabatan,
          peng.jenis_pengajuan,
          peng.tanggal_mulai,
          peng.tanggal_selesai,
          peng.lokasi_dinas,
          peng.alasan_text,
          peng.dokumen_foto,
          peng.status,
          peng.tanggal_pengajuan,
          peng.tanggal_approval,
          peng.catatan_approval
        FROM pengajuan peng
        INNER JOIN pegawai p ON peng.id_pegawai = p.id_pegawai
        WHERE peng.id_pengajuan = ?
      `, [id]);
      
      const data = rows[0];
      
      res.json({
        success: true,
        data
      });
      return;
    }
    
    res.json({ success: true, data: [] });
    
  } catch (error) {
    console.error('Get detail laporan error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
};

// Detail Absen - GET detail absen by date and user_id
const getDetailAbsen = async (req, res) => {
  try {
    const { date, user_id } = req.query;
    
    if (!date || !user_id) {
      return res.json({ success: false, message: 'Tanggal dan User ID diperlukan' });
    }
    
    const db = await getConnection();
    
    // Query untuk mengambil detail absen
    const [rows] = await db.execute(`
      SELECT 
        p.id_presensi as id,
        pg.nama_lengkap,
        pg.nip,
        p.tanggal,
        p.jam_masuk,
        p.jam_pulang,
        CASE 
          WHEN p.foto_masuk IS NOT NULL AND p.foto_masuk != '' 
          THEN CONCAT('http://192.168.1.8:3000/uploads/presensi/', p.foto_masuk)
          ELSE NULL
        END as foto_masuk,
        CASE 
          WHEN p.foto_pulang IS NOT NULL AND p.foto_pulang != '' 
          THEN CONCAT('http://192.168.1.8:3000/uploads/presensi/', p.foto_pulang)
          ELSE NULL
        END as foto_pulang,
        p.lintang_masuk as lat_masuk,
        p.bujur_masuk as long_masuk,
        p.lintang_pulang as lat_pulang,
        p.bujur_pulang as long_pulang,
        p.status,
        lk.nama_lokasi as lokasi_masuk,
        CASE 
          WHEN p.jam_pulang IS NOT NULL THEN lk.nama_lokasi
          ELSE NULL 
        END as lokasi_pulang
      FROM presensi p
      INNER JOIN pegawai pg ON p.id_user = pg.id_user
      LEFT JOIN lokasi_kantor lk ON p.lokasi_id = lk.id
      WHERE DATE_FORMAT(p.tanggal, '%Y-%m-%d') = ? AND p.id_user = ?
      LIMIT 1
    `, [date, user_id]);
    
    if (rows.length > 0) {
      const detail = rows[0];
      
      // Format data untuk response
      const responseData = {
        id: detail.id,
        nama_lengkap: detail.nama_lengkap,
        nip: detail.nip,
        tanggal: detail.tanggal,
        jam_masuk: detail.jam_masuk,
        jam_pulang: detail.jam_pulang,
        foto_masuk: detail.foto_masuk,
        foto_pulang: detail.foto_pulang,
        lat_masuk: parseFloat(detail.lat_masuk || 0),
        long_masuk: parseFloat(detail.long_masuk || 0),
        lat_pulang: detail.lat_pulang ? parseFloat(detail.lat_pulang) : null,
        long_pulang: detail.long_pulang ? parseFloat(detail.long_pulang) : null,
        status: detail.status,
        lokasi_masuk: detail.lokasi_masuk || '-',
        lokasi_pulang: detail.lokasi_pulang || '-'
      };
      
      res.json({
        success: true,
        data: responseData
      });
    } else {
      res.json({
        success: false,
        message: 'Data absen tidak ditemukan'
      });
    }
    
  } catch (error) {
    console.error('Get detail absen error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

// Export PDF - GET export data for PDF
const exportPDF = async (req, res) => {
  try {
    const { type = 'absen', date, start_date, end_date } = req.query;
    const currentDate = date || new Date().toISOString().split('T')[0];
    const startDate = start_date || currentDate;
    const endDate = end_date || currentDate;
    
    const db = await getConnection();
    let filename = '';
    let data = [];
    
    switch (type) {
      case 'absen':
        filename = `Laporan_Absen_${new Date().toISOString().split('T')[0]}.pdf`;
        const [absenRows] = await db.execute(`
          SELECT p.nama_lengkap, p.nip, pr.tanggal, pr.jam_masuk, pr.jam_pulang as jam_keluar, pr.status
          FROM presensi pr
          JOIN pegawai p ON pr.id_user = p.id_user
          WHERE pr.tanggal BETWEEN ? AND ?
          ORDER BY pr.tanggal DESC, p.nama_lengkap ASC
        `, [startDate, endDate]);
        data = absenRows;
        break;
        
      case 'dinas':
        filename = `Laporan_Dinas_${new Date().toISOString().split('T')[0]}.pdf`;
        const [dinasRows] = await db.execute(`
          SELECT p.nama_lengkap, p.nip, pg.jenis_pengajuan, pg.tanggal_mulai, 
                 pg.tanggal_selesai, pg.lokasi_dinas, pg.status
          FROM pengajuan pg
          JOIN pegawai p ON pg.id_pegawai = p.id_pegawai
          WHERE pg.tanggal_mulai BETWEEN ? AND ?
          AND pg.jenis_pengajuan LIKE 'dinas_%'
          ORDER BY pg.tanggal_mulai DESC
        `, [startDate, endDate]);
        data = dinasRows;
        break;
        
      case 'izin':
        filename = `Laporan_Izin_Cuti_${new Date().toISOString().split('T')[0]}.pdf`;
        const [izinRows] = await db.execute(`
          SELECT p.nama_lengkap, p.nip, pg.jenis_pengajuan, pg.tanggal_mulai, 
                 pg.tanggal_selesai, pg.alasan_text, pg.status
          FROM pengajuan pg
          JOIN pegawai p ON pg.id_pegawai = p.id_pegawai
          WHERE pg.tanggal_mulai BETWEEN ? AND ?
          AND (pg.jenis_pengajuan LIKE 'cuti_%' OR pg.jenis_pengajuan = 'izin_pribadi')
          ORDER BY pg.tanggal_mulai DESC
        `, [startDate, endDate]);
        data = izinRows;
        break;
        
      case 'lembur':
        filename = `Laporan_Lembur_${new Date().toISOString().split('T')[0]}.pdf`;
        const [lemburRows] = await db.execute(`
          SELECT p.nama_lengkap, p.nip, pg.jenis_pengajuan, pg.tanggal_mulai, 
                 pg.jam_mulai, pg.jam_selesai, pg.alasan_text, pg.status
          FROM pengajuan pg
          JOIN pegawai p ON pg.id_pegawai = p.id_pegawai
          WHERE pg.tanggal_mulai BETWEEN ? AND ?
          AND pg.jenis_pengajuan LIKE 'lembur_%'
          ORDER BY pg.tanggal_mulai DESC
        `, [startDate, endDate]);
        data = lemburRows;
        break;
    }
    
    res.json({
      success: true,
      message: 'PDF berhasil dibuat',
      filename,
      data_count: data.length,
      type,
      period: `${startDate} s/d ${endDate}`
    });
    
  } catch (error) {
    console.error('Export PDF error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
};

module.exports = { 
  getLaporan, 
  getDetailAbsenPegawai, 
  getDetailLaporan, 
  getDetailAbsen, 
  exportPDF,
  getDynamicAttendanceStatus
};
