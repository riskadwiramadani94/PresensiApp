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

// Function to auto-generate "Tidak Hadir" for all employees
const autoGenerateTidakHadir = async (db, filter_date, start_date, end_date, month, year) => {
  try {
    // Determine date range
    let startDateStr, endDateStr;
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    
    if (filter_date === 'harian' && start_date) {
      startDateStr = start_date;
      endDateStr = start_date;
    } else if (filter_date === 'mingguan' && start_date && end_date) {
      startDateStr = start_date;
      endDateStr = end_date;
    } else if (filter_date === 'bulanan' && month && year) {
      startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, parseInt(month), 0).getDate();
      endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (filter_date === 'tahunan' && year) {
      startDateStr = `${year}-01-01`;
      endDateStr = `${year}-12-31`;
    } else {
      return; // No filter, skip
    }
    
    // Only process dates up to today
    if (endDateStr > currentDate) {
      endDateStr = currentDate;
    }
    
    // Get all active pegawai
    const [pegawaiList] = await db.execute(`
      SELECT p.id_user
      FROM pegawai p
      INNER JOIN users u ON p.id_user = u.id_user
      WHERE u.role = 'pegawai' AND p.id_user IS NOT NULL
    `);
    
    // Loop through each date in range
    let currentDateLoop = new Date(startDateStr);
    const endDateObj = new Date(endDateStr);
    
    while (currentDateLoop <= endDateObj) {
      const dateStr = currentDateLoop.toISOString().split('T')[0];
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = dayNames[currentDateLoop.getDay()];
      
      // Check if it's a work day
      const [jamKerjaRows] = await db.execute(
        'SELECT is_kerja, batas_absen FROM jam_kerja_hari WHERE hari = ?',
        [dayName]
      );
      const isWorkDay = jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1;
      
      // Check if it's a holiday
      const [holidayRows] = await db.execute(
        'SELECT id FROM hari_libur WHERE tanggal = ? AND is_active = 1',
        [dateStr]
      );
      const isHoliday = holidayRows.length > 0;
      
      // ✅ HANYA insert "Tidak Hadir" jika:
      // 1. Hari kerja (is_kerja=1)
      // 2. BUKAN hari libur
      // 3. Sudah lewat batas absen
      if (isWorkDay && !isHoliday && jamKerjaRows.length > 0) {
        const { batas_absen } = jamKerjaRows[0];
        const currentTime = now.toTimeString().slice(0, 8);
        
        // Only insert if date is before today OR (today AND past batas_absen)
        if (dateStr < currentDate || (dateStr === currentDate && currentTime > batas_absen)) {
          // For each pegawai, check if they have attendance
          for (const pegawai of pegawaiList) {
            // Check if on cuti
            const [cutiRows] = await db.execute(
              'SELECT id_pengajuan FROM pengajuan WHERE id_user = ? AND tanggal_mulai <= ? AND (tanggal_selesai >= ? OR tanggal_selesai IS NULL) AND status = "disetujui" AND jenis_pengajuan IN ("cuti_sakit", "cuti_tahunan", "cuti_alasan_penting")',
              [pegawai.id_user, dateStr, dateStr]
            );
            
            // Skip jika sedang cuti
            if (cutiRows.length > 0) {
              continue;
            }
            
            // Check if on dinas
            const [dinasRows] = await db.execute(
              'SELECT d.id_dinas FROM dinas_pegawai dp JOIN dinas d ON dp.id_dinas = d.id_dinas WHERE dp.id_user = ? AND ? BETWEEN DATE(d.tanggal_mulai) AND DATE(d.tanggal_selesai) AND dp.status_konfirmasi = "konfirmasi"',
              [pegawai.id_user, dateStr]
            );
            
            if (dinasRows.length > 0) {
              // Sedang dinas - HAPUS presensi kantor jika ada
              await db.execute(
                'DELETE FROM presensi WHERE id_user = ? AND tanggal = ? AND jenis_presensi = "kantor"',
                [pegawai.id_user, dateStr]
              );
              
              // Cek apakah sudah ada presensi dinas
              const [presensiDinasRows] = await db.execute(
                'SELECT id_presensi FROM presensi WHERE id_user = ? AND tanggal = ? AND jenis_presensi = "dinas"',
                [pegawai.id_user, dateStr]
              );
              
              if (presensiDinasRows.length === 0) {
                // Belum ada presensi dinas → Insert "Tidak Hadir" DINAS
                await db.execute(
                  'INSERT IGNORE INTO presensi (id_user, tanggal, status, status_validasi, jenis_presensi, dinas_id) VALUES (?, ?, "Tidak Hadir", "disetujui", "dinas", ?)',
                  [pegawai.id_user, dateStr, dinasRows[0].id_dinas]
                );
              }
            } else {
              // Tidak sedang dinas - cek presensi kantor
              const [presensiKantorRows] = await db.execute(
                'SELECT id_presensi FROM presensi WHERE id_user = ? AND tanggal = ? AND jenis_presensi = "kantor"',
                [pegawai.id_user, dateStr]
              );
              
              if (presensiKantorRows.length === 0) {
                // Belum ada presensi kantor → Insert "Tidak Hadir" KANTOR
                await db.execute(
                  'INSERT IGNORE INTO presensi (id_user, tanggal, status, status_validasi, jenis_presensi) VALUES (?, ?, "Tidak Hadir", "disetujui", "kantor")',
                  [pegawai.id_user, dateStr]
                );
              }
            }
          }
        }
      }
      
      currentDateLoop.setDate(currentDateLoop.getDate() + 1);
    }
  } catch (error) {
    console.error('Auto-generate Tidak Hadir error:', error);
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

      // Hitung total dinas (dari tabel dinas_pegawai)
      const [totalDinasRows] = await db.execute(`
        SELECT COUNT(DISTINCT dp.id) as total 
        FROM dinas_pegawai dp
        INNER JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.status_konfirmasi = 'konfirmasi'
      `);
      const totalDinas = totalDinasRows[0].total;

      // Hitung total izin/cuti yang disetujui
      const [totalIzinRows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM pengajuan 
        WHERE jenis_pengajuan IN ('izin_pribadi', 'cuti_sakit', 'cuti_tahunan') 
        AND status = 'disetujui'
      `);
      const totalIzin = totalIzinRows[0].total;

      // Hitung total lembur yang disetujui
      const [totalLemburRows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM pengajuan 
        WHERE jenis_pengajuan = 'lembur' 
        AND status = 'disetujui'
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
      const { filter_date, start_date, end_date, month, year } = req.query;
      
      // Build date filter
      let dateFilter = '';
      let dateParams = [];
      
      if (filter_date === 'harian' && start_date) {
        dateFilter = 'AND DATE(pr.tanggal) = ?';
        dateParams = [start_date];
      } else if (filter_date === 'mingguan' && start_date && end_date) {
        dateFilter = 'AND DATE(pr.tanggal) BETWEEN ? AND ?';
        dateParams = [start_date, end_date];
      } else if (filter_date === 'bulanan' && month && year) {
        dateFilter = 'AND MONTH(pr.tanggal) = ? AND YEAR(pr.tanggal) = ?';
        dateParams = [month, year];
      } else if (filter_date === 'tahunan' && year) {
        dateFilter = 'AND YEAR(pr.tanggal) = ?';
        dateParams = [year];
      }
      
      // Auto-generate "Tidak Hadir" untuk semua pegawai yang belum absen
      await autoGenerateTidakHadir(db, filter_date, start_date, end_date, month, year);
      
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
        // Query untuk menghitung SEMUA presensi (kantor + dinas) tanpa duplikasi per tanggal
        const gabunganQuery = `
          SELECT 
            CASE 
              WHEN status IN ('Hadir', 'hadir') THEN 'Hadir'
              WHEN status IN ('Terlambat', 'terlambat') THEN 'Terlambat' 
              WHEN status IN ('Tidak Hadir', 'tidak_hadir') THEN 'Tidak Hadir'
              ELSE status
            END as status_final
          FROM presensi
          WHERE id_user = ? ${dateFilter.replace(/pr\./g, '')}
        `;
        
        const [gabunganRows] = await db.execute(gabunganQuery, [pegawai.id_user, ...dateParams]);
        
        // Hitung summary dari SEMUA data (tidak ada filter duplikasi)
        let adjustedSummary = {
          'Hadir': 0,
          'Terlambat': 0, 
          'Tidak Hadir': 0,
          'Izin': 0,
          'Sakit': 0,
          'Cuti': 0,
          'Pulang Cepat': 0,
          'Dinas Luar/ Perjalanan Dinas': 0,
          'Mangkir/ Alpha': 0,
          'Libur': 0
        };
        
        // Hitung SEMUA status tanpa filter per tanggal
        gabunganRows.forEach(row => {
          const status = row.status_final;
          if (adjustedSummary[status] !== undefined) {
            adjustedSummary[status]++;
          }
        });
        
        data.push({
          id_pegawai: parseInt(pegawai.id_pegawai),
          nama_lengkap: pegawai.nama_lengkap,
          nip: pegawai.nip,
          foto_profil: pegawai.foto_profil,
          summary: adjustedSummary
        });
      }

      res.json({
        success: true,
        data: data
      });

    } else if (type === 'dinas') {
      // Get all dinas data with pegawai and absen dinas
      let query = `
        SELECT 
          d.id_dinas as id,
          d.nama_kegiatan,
          d.tanggal_mulai,
          d.tanggal_selesai,
          d.status as status_dinas,
          p.nama_lengkap,
          p.nip,
          p.jabatan,
          p.foto_profil,
          dp.status_konfirmasi,
          COUNT(DISTINCT pr.id_presensi) as total_absen,
          SUM(CASE WHEN pr.jam_masuk IS NOT NULL AND pr.jam_pulang IS NOT NULL THEN 1 ELSE 0 END) as absen_lengkap,
          GROUP_CONCAT(DISTINCT lk.nama_lokasi SEPARATOR ', ') as lokasi_dinas
        FROM dinas d
        INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
        INNER JOIN pegawai p ON dp.id_user = p.id_user
        LEFT JOIN presensi pr ON d.id_dinas = pr.dinas_id AND pr.id_user = dp.id_user AND pr.jenis_presensi = 'dinas'
        LEFT JOIN dinas_lokasi dl ON d.id_dinas = dl.id_dinas
        LEFT JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Add date filter if provided
      if (req.query.date) {
        query += ` AND ? BETWEEN d.tanggal_mulai AND d.tanggal_selesai`;
        params.push(req.query.date);
      }
      
      // Add search filter if provided
      if (req.query.search) {
        query += ` AND (p.nama_lengkap LIKE ? OR d.nama_kegiatan LIKE ? OR lk.nama_lokasi LIKE ?)`;
        const searchTerm = `%${req.query.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ` GROUP BY d.id_dinas, dp.id_user, p.nama_lengkap, p.nip, p.jabatan, p.foto_profil, dp.status_konfirmasi`;
      query += ` ORDER BY d.tanggal_mulai DESC`;
      
      const [results] = await db.execute(query, params);
      
      const data = results.map(row => ({
        id: parseInt(row.id),
        nama_kegiatan: row.nama_kegiatan,
        nama_lengkap: row.nama_lengkap,
        nip: row.nip,
        jabatan: row.jabatan,
        foto_profil: row.foto_profil,
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        lokasi_dinas: row.lokasi_dinas,
        status_dinas: row.status_dinas,
        status_konfirmasi: row.status_konfirmasi,
        total_absen: parseInt(row.total_absen || 0),
        absen_lengkap: parseInt(row.absen_lengkap || 0)
      }));
      
      res.json({
        success: true,
        data: data
      });

    } else if (type === 'izin') {
      // Get all izin/cuti data with search functionality
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
          peng.alasan_text,
          peng.status
        FROM pengajuan peng
        INNER JOIN pegawai p ON peng.id_pegawai = p.id_pegawai
        WHERE peng.jenis_pengajuan IN ('izin_pribadi', 'cuti_sakit', 'cuti_tahunan')
      `;
      
      const params = [];
      
      // Add search filter if provided
      if (req.query.search) {
        query += ` AND (p.nama_lengkap LIKE ? OR p.nip LIKE ? OR peng.alasan_text LIKE ?)`;
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
        alasan_text: row.alasan_text,
        status: row.status
      }));
      
      res.json({
        success: true,
        data: data
      });

    } else if (type === 'lembur') {
      const { filter_date, start_date, end_date, month, year, search } = req.query;
      
      // Build date filter
      let dateFilter = '';
      let dateParams = [];
      
      if (filter_date === 'mingguan' && start_date && end_date) {
        dateFilter = 'AND DATE(peng.tanggal_mulai) BETWEEN ? AND ?';
        dateParams = [start_date, end_date];
      } else if (filter_date === 'bulanan' && month && year) {
        dateFilter = 'AND MONTH(peng.tanggal_mulai) = ? AND YEAR(peng.tanggal_mulai) = ?';
        dateParams = [month, year];
      } else if (filter_date === 'tahunan' && year) {
        dateFilter = 'AND YEAR(peng.tanggal_mulai) = ?';
        dateParams = [year];
      }
      
      // Get all pegawai with lembur summary
      const [pegawaiResults] = await db.execute(`
        SELECT 
          p.id_pegawai,
          p.nama_lengkap,
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
        // Get lembur summary with date filter
        const summaryQuery = `
          SELECT 
            COUNT(*) as total_pengajuan,
            SUM(CASE WHEN peng.status = 'disetujui' THEN 1 ELSE 0 END) as disetujui,
            SUM(CASE WHEN peng.status = 'menunggu' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN peng.status = 'ditolak' THEN 1 ELSE 0 END) as ditolak,
            SUM(
              CASE 
                WHEN peng.status = 'disetujui' 
                THEN DATEDIFF(
                  COALESCE(peng.tanggal_selesai, peng.tanggal_mulai), 
                  peng.tanggal_mulai
                ) + 1
                ELSE 0
              END
            ) as total_hari,
            SUM(
              CASE 
                WHEN peng.status = 'disetujui' 
                AND peng.jam_mulai IS NOT NULL 
                AND peng.jam_selesai IS NOT NULL
                AND EXISTS (
                  SELECT 1 FROM absen_lembur al 
                  WHERE al.id_pengajuan = peng.id_pengajuan 
                  AND al.jam_masuk IS NOT NULL
                )
                THEN TIMESTAMPDIFF(HOUR, 
                  CONCAT(peng.tanggal_mulai, ' ', peng.jam_mulai),
                  CONCAT(COALESCE(peng.tanggal_selesai, peng.tanggal_mulai), ' ', peng.jam_selesai)
                )
                ELSE 0
              END
            ) as total_jam
          FROM pengajuan peng
          WHERE peng.id_pegawai = ? 
          AND peng.jenis_pengajuan = 'lembur'
          ${dateFilter}
        `;
        
        const [summaryRows] = await db.execute(summaryQuery, [pegawai.id_pegawai, ...dateParams]);
        const summary = summaryRows[0];
        
        // Only include pegawai with lembur data
        if (parseInt(summary.total_pengajuan) > 0) {
          // Apply search filter if provided
          if (search && !pegawai.nama_lengkap.toLowerCase().includes(search.toLowerCase()) && 
              !pegawai.nip.includes(search)) {
            continue;
          }
          
          data.push({
            id_pegawai: parseInt(pegawai.id_pegawai),
            nama_lengkap: pegawai.nama_lengkap,
            nip: pegawai.nip,
            foto_profil: pegawai.foto_profil,
            summary: {
              total_pengajuan: parseInt(summary.total_pengajuan || 0),
              disetujui: parseInt(summary.disetujui || 0),
              pending: parseInt(summary.pending || 0),
              ditolak: parseInt(summary.ditolak || 0),
              total_hari: parseInt(summary.total_hari || 0),
              total_jam: parseInt(summary.total_jam || 0)
            }
          });
        }
      }
      
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
    const { filter_date, start_date, end_date, month, year } = req.query;
    
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
    
    // Determine date range based on filter_date
    let startDateStr, endDateStr;
    
    if (filter_date === 'harian' && start_date) {
      startDateStr = start_date;
      endDateStr = start_date;
    } else if (filter_date === 'mingguan' && start_date && end_date) {
      startDateStr = start_date;
      endDateStr = end_date;
    } else if (filter_date === 'bulanan' && month && year) {
      startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, parseInt(month), 0).getDate();
      endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      console.log('Bulanan filter:', { month, year, startDateStr, endDateStr });
    } else if (filter_date === 'tahunan' && year) {
      startDateStr = `${year}-01-01`;
      endDateStr = `${year}-12-31`;
    } else {
      // Default to current month
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      startDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      endDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      console.log('Default filter (current month):', { currentMonth, currentYear, startDateStr, endDateStr });
    }
    
    const absenData = [];
    let currentDate = new Date(startDateStr + 'T00:00:00');
    const endDateObj = new Date(endDateStr + 'T00:00:00');
    
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
        AND dp.status_konfirmasi = 'konfirmasi'
        LIMIT 1
      `, [user_id, dateStr]);
      const dinas = dinasRows[0];
      
      // Cek presensi normal
      const [presensiRows] = await db.execute(`
        SELECT tanggal, jam_masuk, jam_pulang, status, alasan_luar_lokasi as keterangan
        FROM presensi 
        WHERE id_user = ? AND tanggal = ?
      `, [user_id, dateStr]);
      let presensi = presensiRows[0];
      
      // Auto-insert "Tidak Hadir" jika sudah lewat batas absen dan belum ada presensi
      if (!presensi && isWorkDay && !isHoliday && !dinas && !pengajuan) {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 8);
        
        // Hanya untuk hari ini atau hari sebelumnya
        if (dateStr <= currentDate && jamKerjaRows.length > 0) {
          const { batas_absen } = jamKerjaRows[0];
          
          // Jika sudah lewat batas absen, insert "Tidak Hadir"
          if (dateStr < currentDate || (dateStr === currentDate && currentTime > batas_absen)) {
            await db.execute(`
              INSERT INTO presensi (id_user, tanggal, status, status_validasi)
              VALUES (?, ?, 'Tidak Hadir', 'disetujui')
            `, [user_id, dateStr]);
            
            // Fetch ulang presensi yang baru diinsert
            const [newPresensiRows] = await db.execute(`
              SELECT tanggal, jam_masuk, jam_pulang, status, alasan_luar_lokasi as keterangan
              FROM presensi 
              WHERE id_user = ? AND tanggal = ?
            `, [user_id, dateStr]);
            presensi = newPresensiRows[0];
          }
        }
      }
      
      // Cek pengajuan izin/cuti yang disetujui
      const [pengajuanRows] = await db.execute(`
        SELECT jenis_pengajuan, jam_mulai, jam_selesai, alasan_text
        FROM pengajuan
        WHERE id_user = ?
          AND tanggal_mulai <= ?
          AND (tanggal_selesai >= ? OR tanggal_selesai IS NULL)
          AND status = 'disetujui'
          AND jenis_pengajuan IN (
            'izin_datang_terlambat', 
            'izin_pulang_cepat', 
            'cuti_sakit', 
            'cuti_tahunan', 
            'cuti_alasan_penting'
          )
        LIMIT 1
      `, [user_id, dateStr, dateStr]);
      const pengajuan = pengajuanRows[0];
      
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
      // PRIORITY 3: Cuti yang disetujui
      else if (pengajuan && pengajuan.jenis_pengajuan.includes('cuti')) {
        const jenisLabel = pengajuan.jenis_pengajuan === 'cuti_sakit' ? 'Cuti Sakit' :
                          pengajuan.jenis_pengajuan === 'cuti_tahunan' ? 'Cuti Tahunan' :
                          'Cuti Alasan Penting';
        absenData.push({
          tanggal: dateStr,
          status: 'Cuti',
          jam_masuk: null,
          jam_keluar: null,
          keterangan: `${jenisLabel}: ${pengajuan.alasan_text}`
        });
      }
      // PRIORITY 4: Ada presensi
      else if (presensi) {
        let keterangan = presensi.keterangan || 'Absen normal';
        
        // Tambahkan info izin jika ada
        if (pengajuan) {
          const jenisLabel = pengajuan.jenis_pengajuan === 'izin_datang_terlambat' ? 'Izin Datang Terlambat' : 'Izin Pulang Cepat';
          keterangan = `${jenisLabel}: ${pengajuan.alasan_text}`;
        }
        
        absenData.push({
          tanggal: presensi.tanggal,
          status: presensi.status,
          jam_masuk: presensi.jam_masuk,
          jam_keluar: presensi.jam_pulang,
          keterangan: keterangan
        });
      } else if (dinas) {
        // Sedang dinas - cek apakah ada absen dinas
        const [absenDinasRows] = await db.execute(`
          SELECT jam_masuk, jam_pulang, status
          FROM presensi 
          WHERE id_user = ? AND tanggal = ? AND jenis_presensi = 'dinas'
        `, [user_id, dateStr]);
        
        const absenDinas = absenDinasRows[0];
        
        if (absenDinas) {
          // Ada absen dinas - return status absen sebenarnya dengan keterangan dinas
          let finalStatus = 'Hadir';
          let dinasKeterangan = 'Dinas-Hadir';
          
          if (absenDinas.status === 'terlambat') {
            finalStatus = 'Terlambat';
            dinasKeterangan = 'Dinas-Terlambat';
          } else if (absenDinas.status === 'tidak_hadir') {
            finalStatus = 'Tidak Hadir';
            dinasKeterangan = 'Dinas-Tidak Hadir';
          } else if (absenDinas.status === 'hadir') {
            finalStatus = 'Hadir';
            dinasKeterangan = 'Dinas-Hadir';
          }
          
          absenData.push({
            tanggal: dateStr,
            status: finalStatus,
            jam_masuk: absenDinas.jam_masuk,
            jam_keluar: absenDinas.jam_pulang,
            keterangan: dinasKeterangan
          });
        } else {
          // Tidak ada absen dinas - Tidak Hadir
          absenData.push({
            tanggal: dateStr,
            status: 'Tidak Hadir',
            jam_masuk: null,
            jam_keluar: null,
            keterangan: 'Dinas-Tidak Hadir'
          });
        }
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
    const { type = 'absen', id, date, user_id, id_pegawai, start_date, end_date, month, year } = req.query;
    const db = await getConnection();
    
    // Detail lembur per pegawai
    if (type === 'lembur' && id_pegawai) {
      // Build date filter
      let dateFilter = '';
      let dateParams = [];
      
      if (start_date && end_date) {
        dateFilter = 'AND DATE(peng.tanggal_mulai) BETWEEN ? AND ?';
        dateParams = [start_date, end_date];
      } else if (month && year) {
        dateFilter = 'AND MONTH(peng.tanggal_mulai) = ? AND YEAR(peng.tanggal_mulai) = ?';
        dateParams = [month, year];
      } else if (year) {
        dateFilter = 'AND YEAR(peng.tanggal_mulai) = ?';
        dateParams = [year];
      }
      
      const [rows] = await db.execute(`
        SELECT 
          peng.tanggal_mulai as tanggal,
          peng.status,
          peng.jam_mulai,
          peng.jam_selesai,
          peng.alasan_text as keterangan,
          CASE WHEN peng.id_pengajuan IS NOT NULL THEN 1 ELSE 0 END as has_pengajuan,
          CASE WHEN al.id_absen_lembur IS NOT NULL THEN 1 ELSE 0 END as has_absen
        FROM pengajuan peng
        LEFT JOIN absen_lembur al ON peng.id_pengajuan = al.id_pengajuan
        WHERE peng.id_pegawai = ?
        AND peng.jenis_pengajuan = 'lembur'
        ${dateFilter}
        ORDER BY peng.tanggal_mulai DESC
      `, [id_pegawai, ...dateParams]);
      
      res.json({
        success: true,
        data: rows
      });
      return;
    }
    
    // Detail lembur per tanggal
    if (type === 'lembur' && date && (user_id || id_pegawai)) {
      // Jika ada id_pegawai, convert ke user_id dulu
      let finalUserId = user_id;
      if (id_pegawai && !user_id) {
        const [pegawaiRows] = await db.execute('SELECT id_user FROM pegawai WHERE id_pegawai = ?', [id_pegawai]);
        if (pegawaiRows.length > 0) {
          finalUserId = pegawaiRows[0].id_user;
        }
      }
      
      if (!finalUserId) {
        return res.json({ success: false, message: 'User ID tidak ditemukan' });
      }
      
      const [pengajuanRows] = await db.execute(`
        SELECT 
          peng.id_pengajuan,
          peng.tanggal_mulai as tanggal,
          peng.status,
          peng.jam_mulai,
          peng.jam_selesai,
          peng.alasan_text as alasan,
          TIMESTAMPDIFF(HOUR, 
            CONCAT(peng.tanggal_mulai, ' ', peng.jam_mulai),
            CONCAT(COALESCE(peng.tanggal_selesai, peng.tanggal_mulai), ' ', peng.jam_selesai)
          ) as durasi
        FROM pengajuan peng
        WHERE peng.id_user = ?
        AND DATE(peng.tanggal_mulai) = ?
        AND peng.jenis_pengajuan = 'lembur'
        LIMIT 1
      `, [finalUserId, date]);
      
      const [absenRows] = await db.execute(`
        SELECT 
          al.jam_masuk,
          al.jam_pulang,
          al.foto_masuk,
          al.foto_pulang,
          TIMESTAMPDIFF(HOUR, al.jam_masuk, al.jam_pulang) as durasi_aktual
        FROM absen_lembur al
        WHERE al.id_user = ?
        AND DATE(al.tanggal) = ?
        LIMIT 1
      `, [finalUserId, date]);
      
      const data = {
        tanggal: date,
        status: pengajuanRows[0]?.status || 'Belum Ada Pengajuan',
        pengajuan: pengajuanRows[0] ? {
          alasan: pengajuanRows[0].alasan,
          jam_mulai: pengajuanRows[0].jam_mulai,
          jam_selesai: pengajuanRows[0].jam_selesai,
          durasi: `${pengajuanRows[0].durasi || 0} jam`
        } : null,
        absen: absenRows[0] ? {
          jam_masuk: absenRows[0].jam_masuk,
          jam_keluar: absenRows[0].jam_pulang,
          foto_masuk: absenRows[0].foto_masuk,
          foto_pulang: absenRows[0].foto_pulang,
          durasi_aktual: `${absenRows[0].durasi_aktual || 0} jam`,
          lokasi_masuk: '-',
          lokasi_pulang: '-'
        } : null
      };
      
      res.json({
        success: true,
        data
      });
      return;
    }
    
    // Jika ada ID, ambil detail single record
    if (id && type === 'dinas') {
      const [rows] = await db.execute(`
        SELECT 
          d.id_dinas,
          d.nama_kegiatan,
          d.tanggal_mulai,
          d.tanggal_selesai,
          d.status,
          d.deskripsi,
          p.nama_lengkap,
          p.nip,
          p.foto_profil,
          p.jabatan,
          dp.status_konfirmasi,
          dp.tanggal_konfirmasi,
          GROUP_CONCAT(DISTINCT lk.nama_lokasi SEPARATOR ', ') as lokasi_dinas,
          COUNT(DISTINCT pr.id_presensi) as total_absen,
          SUM(CASE WHEN pr.jam_masuk IS NOT NULL AND pr.jam_pulang IS NOT NULL THEN 1 ELSE 0 END) as absen_lengkap
        FROM dinas d
        INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
        INNER JOIN pegawai p ON dp.id_user = p.id_user
        LEFT JOIN presensi pr ON d.id_dinas = pr.dinas_id AND pr.id_user = dp.id_user AND pr.jenis_presensi = 'dinas'
        LEFT JOIN dinas_lokasi dl ON d.id_dinas = dl.id_dinas
        LEFT JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
        WHERE d.id_dinas = ?
        GROUP BY d.id_dinas, dp.id_user, p.nama_lengkap, p.nip, p.foto_profil, p.jabatan, dp.status_konfirmasi, dp.tanggal_konfirmasi
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
        p.foto_masuk,
        p.foto_pulang,
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
          SELECT 
            p.nama_lengkap, 
            p.nip, 
            d.nama_kegiatan,
            d.tanggal_mulai, 
            d.tanggal_selesai, 
            GROUP_CONCAT(DISTINCT lk.nama_lokasi SEPARATOR ', ') as lokasi_dinas,
            d.status,
            dp.status_konfirmasi,
            COUNT(DISTINCT pr.id_presensi) as total_absen
          FROM dinas d
          INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
          INNER JOIN pegawai p ON dp.id_user = p.id_user
          LEFT JOIN presensi pr ON d.id_dinas = pr.dinas_id AND pr.id_user = dp.id_user AND pr.jenis_presensi = 'dinas'
          LEFT JOIN dinas_lokasi dl ON d.id_dinas = dl.id_dinas
          LEFT JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
          WHERE d.tanggal_mulai BETWEEN ? AND ?
          GROUP BY d.id_dinas, dp.id_user, p.nama_lengkap, p.nip, dp.status_konfirmasi
          ORDER BY d.tanggal_mulai DESC
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
                 pg.tanggal_selesai, pg.jam_mulai, pg.jam_selesai, pg.alasan_text, pg.status
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
