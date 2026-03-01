const { getConnection } = require('../config/database');

// Function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000; // Earth radius in meters
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return earthRadius * c; // Distance in meters
};

// NEW: Check work day (hari libur atau hari kerja)
const checkWorkDay = async (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    if (!user_id || !date) {
      return res.json({ 
        success: false, 
        message: 'user_id dan date diperlukan' 
      });
    }
    
    const db = await getConnection();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dateObj = new Date(date);
    const dayName = dayNames[dateObj.getDay()];
    
    // PRIORITAS 1: Cek kalender libur
    const [hariLiburRows] = await db.execute(
      'SELECT nama_libur, jenis FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [date]
    );
    
    if (hariLiburRows.length > 0) {
      const jenisMap = {
        'nasional': 'Libur Nasional',
        'keagamaan': 'Libur Keagamaan',
        'perusahaan': 'Libur Perusahaan'
      };
      const jenisLabel = jenisMap[hariLiburRows[0].jenis] || 'Libur';
      
      return res.json({
        success: true,
        is_work_day: false,
        is_holiday: true,
        holiday_info: {
          nama_libur: hariLiburRows[0].nama_libur,
          jenis: hariLiburRows[0].jenis
        },
        reason: `${hariLiburRows[0].nama_libur} (${jenisLabel})`
      });
    }
    
    // PRIORITAS 2: Cek apakah pegawai sedang dinas
    const [dinasRows] = await db.execute(`
      SELECT d.id_dinas, d.tipe_jam_kerja
      FROM dinas d
      INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
      WHERE dp.id_user = ?
        AND ? BETWEEN d.tanggal_mulai AND d.tanggal_selesai
        AND d.status = 'aktif'
        AND dp.status_konfirmasi = 'konfirmasi'
      LIMIT 1
    `, [user_id, date]);
    
    if (dinasRows.length > 0 && dinasRows[0].tipe_jam_kerja === 'custom') {
      // Dinas custom = semua hari kerja (skip cek is_kerja)
      return res.json({
        success: true,
        is_work_day: true,
        is_holiday: false,
        is_dinas: true,
        tipe_jam_kerja: 'custom'
      });
    }
    
    // PRIORITAS 3: Cek is_kerja di jam_kerja_history
    const [jamKerjaRows] = await db.execute(`
      SELECT is_kerja 
      FROM jam_kerja_history 
      WHERE hari = ? 
      AND ? BETWEEN tanggal_mulai_berlaku AND IFNULL(tanggal_selesai_berlaku, '9999-12-31')
      ORDER BY tanggal_mulai_berlaku DESC
      LIMIT 1
    `, [dayName, date]);
    
    if (jamKerjaRows.length === 0 || jamKerjaRows[0].is_kerja === 0) {
      return res.json({
        success: true,
        is_work_day: false,
        is_holiday: false,
        reason: `Hari ${dayName} - Libur`
      });
    }
    
    // Hari kerja
    return res.json({
      success: true,
      is_work_day: true,
      is_holiday: false
    });
    
  } catch (error) {
    console.error('Check work day error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Check dinas status and return valid locations
const checkDinasStatus = async (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    if (!user_id || !date) {
      return res.json({ 
        success: false, 
        message: 'user_id dan date diperlukan' 
      });
    }
    
    const db = await getConnection();
    
    // Query 1: Cek apakah pegawai sedang dinas hari ini
    const [dinasRows] = await db.execute(`
      SELECT 
        d.id_dinas,
        d.nama_kegiatan,
        d.tanggal_mulai,
        d.tanggal_selesai,
        d.tipe_jam_kerja,
        d.jam_mulai,
        d.jam_selesai
      FROM dinas d
      INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
      WHERE dp.id_user = ?
        AND ? BETWEEN d.tanggal_mulai AND d.tanggal_selesai
        AND d.status = 'aktif'
        AND dp.status_konfirmasi = 'konfirmasi'
      LIMIT 1
    `, [user_id, date]);
    
    if (dinasRows.length > 0) {
      // Pegawai sedang dinas
      const dinas = dinasRows[0];
      
      // Ambil lokasi yang didaftarkan di dinas ini
      const [lokasiDinasRows] = await db.execute(`
        SELECT 
          lk.id,
          lk.nama_lokasi,
          lk.alamat,
          lk.lintang AS latitude,
          lk.bujur AS longitude,
          lk.radius,
          lk.jenis_lokasi
        FROM dinas_lokasi dl
        INNER JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
        WHERE dl.id_dinas = ?
          AND lk.status = 'aktif'
          AND lk.is_active = 1
        ORDER BY lk.jenis_lokasi, lk.nama_lokasi
      `, [dinas.id_dinas]);
      
      return res.json({
        success: true,
        is_dinas: true,
        dinas_info: {
          id_dinas: dinas.id_dinas,
          nama_kegiatan: dinas.nama_kegiatan,
          tanggal_mulai: dinas.tanggal_mulai,
          tanggal_selesai: dinas.tanggal_selesai,
          tipe_jam_kerja: dinas.tipe_jam_kerja,
          jam_mulai: dinas.jam_mulai,
          jam_selesai: dinas.jam_selesai
        },
        lokasi_valid: lokasiDinasRows
      });
    } else {
      // Pegawai tidak sedang dinas
      // Query 2a: Ambil semua lokasi kantor tetap
      const [lokasiRows] = await db.execute(`
        SELECT 
          id,
          nama_lokasi,
          alamat,
          lintang AS latitude,
          bujur AS longitude,
          radius,
          jenis_lokasi
        FROM lokasi_kantor
        WHERE jenis_lokasi = 'tetap'
          AND status = 'aktif'
          AND is_active = 1
        ORDER BY nama_lokasi
      `);
      
      return res.json({
        success: true,
        is_dinas: false,
        lokasi_valid: lokasiRows
      });
    }
  } catch (error) {
    console.error('Check dinas status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPresensi = async (req, res) => {
  try {
    const { user_id, tanggal, start_date, end_date } = req.query;
    const targetDate = tanggal || new Date().toISOString().split('T')[0];

    if (!user_id) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();

    // If start_date and end_date provided, get range data
    if (start_date && end_date) {
      // Get presensi data - prioritize records with jam_masuk
      const [rangeRows] = await db.execute(
        `SELECT 
          DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
          TIME_FORMAT(jam_masuk, '%H:%i:%s') as jam_masuk,
          TIME_FORMAT(jam_pulang, '%H:%i:%s') as jam_keluar,
          status,
          alasan_luar_lokasi as keterangan
        FROM presensi 
        WHERE id_user = ? 
        AND DATE_FORMAT(tanggal, '%Y-%m-%d') BETWEEN ? AND ?
        ORDER BY tanggal ASC, CASE WHEN jam_masuk IS NULL THEN 1 ELSE 0 END, jam_masuk DESC`,
        [user_id, start_date, end_date]
      );
      
      // Get dinas data for the same period
      const [dinasRows] = await db.execute(
        `SELECT 
          d.nama_kegiatan,
          DATE(d.tanggal_mulai) as tanggal_mulai,
          DATE(d.tanggal_selesai) as tanggal_selesai
        FROM dinas_pegawai dp
        JOIN dinas d ON dp.id_dinas = d.id_dinas
        WHERE dp.id_user = ?
        AND (
          (DATE(d.tanggal_mulai) BETWEEN ? AND ?)
          OR (DATE(d.tanggal_selesai) BETWEEN ? AND ?)
          OR (DATE(d.tanggal_mulai) <= ? AND DATE(d.tanggal_selesai) >= ?)
        )`,
        [user_id, start_date, end_date, start_date, end_date, start_date, end_date]
      );
      
      // Create a map of presensi data - prioritize records with jam_masuk
      const presensiMap = new Map();
      rangeRows.forEach(row => {
        // Only set if not exists OR if current row has jam_masuk and existing doesn't
        if (!presensiMap.has(row.tanggal) || 
            (row.jam_masuk && !presensiMap.get(row.tanggal).jam_masuk)) {
          presensiMap.set(row.tanggal, {
            tanggal: row.tanggal,
            jam_masuk: row.jam_masuk,
            jam_keluar: row.jam_keluar,
            status: row.status,
            keterangan: row.keterangan || (row.status === 'Terlambat' ? 'Terlambat' : 'Hadir normal')
          });
        }
      });
      
      // Generate all dates in range and check dinas status
      const formattedData = [];
      const currentDate = new Date(start_date);
      const endDateObj = new Date(end_date);
      
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Get day name
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = dayNames[currentDate.getDay()];
        
        // PRIORITY 1: Check if it's a holiday from hari_libur
        const [hariLiburRows] = await db.execute(
          'SELECT nama_libur, jenis FROM hari_libur WHERE tanggal = ? AND is_active = 1',
          [dateStr]
        );
        const isHoliday = hariLiburRows.length > 0;
        
        // PRIORITY 2: Check if it's a work day from jam_kerja_history (HISTORIS)
        const [jamKerjaRows] = await db.execute(`
          SELECT is_kerja FROM jam_kerja_history 
          WHERE hari = ? 
          AND ? BETWEEN tanggal_mulai_berlaku AND IFNULL(tanggal_selesai_berlaku, '9999-12-31')
        `, [dayName, dateStr]);
        const isWorkDay = jamKerjaRows.length > 0 && jamKerjaRows[0].is_kerja === 1;
        
        // ✅ CEK LIBUR & WEEKEND DULU sebelum cek presensi
        if (isHoliday) {
          // PRIORITY 1: Hari libur nasional/keagamaan/perusahaan
          const jenisMap = {
            'nasional': 'Libur Nasional',
            'keagamaan': 'Libur Keagamaan',
            'perusahaan': 'Libur Perusahaan'
          };
          const jenisLabel = jenisMap[hariLiburRows[0].jenis] || 'Libur';
          formattedData.push({
            tanggal: dateStr,
            jam_masuk: null,
            jam_keluar: null,
            status: 'Libur',
            keterangan: `${hariLiburRows[0].nama_libur} (${jenisLabel})`
          });
        } else if (!isWorkDay) {
          // PRIORITY 2: Weekend (Sabtu/Minggu)
          formattedData.push({
            tanggal: dateStr,
            jam_masuk: null,
            jam_keluar: null,
            status: 'Libur',
            keterangan: `Hari ${dayName} (Weekend)`
          });
        } else if (presensiMap.has(dateStr)) {
          // PRIORITY 3: Ada data presensi
          formattedData.push(presensiMap.get(dateStr));
        } else {
          // Check if user is on dinas this day
          const isDinas = dinasRows.some(dinas => {
            const dinasStart = new Date(dinas.tanggal_mulai);
            const dinasEnd = new Date(dinas.tanggal_selesai);
            const checkDate = new Date(dateStr);
            return checkDate >= dinasStart && checkDate <= dinasEnd;
          });
          
          if (isDinas) {
            const dinasInfo = dinasRows.find(dinas => {
              const dinasStart = new Date(dinas.tanggal_mulai);
              const dinasEnd = new Date(dinas.tanggal_selesai);
              const checkDate = new Date(dateStr);
              return checkDate >= dinasStart && checkDate <= dinasEnd;
            });
            
            const startDate = new Date(dinasInfo.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric' });
            const endDate = new Date(dinasInfo.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            
            formattedData.push({
              tanggal: dateStr,
              jam_masuk: null,
              jam_keluar: null,
              status: 'Dinas',
              keterangan: `${dinasInfo.nama_kegiatan} (${startDate}-${endDate})`
            });
          } else {
            // PRIORITY 4: Hari kerja tapi tidak ada presensi dan tidak dinas
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(dateStr);
            checkDate.setHours(0, 0, 0, 0);
            
            if (checkDate > today) {
              // Hari yang akan datang
              formattedData.push({
                tanggal: dateStr,
                jam_masuk: null,
                jam_keluar: null,
                status: 'Belum Waktunya',
                keterangan: 'Belum waktunya absen'
              });
            } else if (checkDate.getTime() === today.getTime()) {
              // Hari ini - cek apakah sudah lewat jam pulang
              const now = new Date();
              const jamPulang = new Date();
              jamPulang.setHours(17, 0, 0, 0);
              
              if (now > jamPulang) {
                formattedData.push({
                  tanggal: dateStr,
                  jam_masuk: null,
                  jam_keluar: null,
                  status: 'Tidak Hadir',
                  keterangan: 'Tidak hadir'
                });
              } else {
                formattedData.push({
                  tanggal: dateStr,
                  jam_masuk: null,
                  jam_keluar: null,
                  status: 'Belum Absen',
                  keterangan: 'Belum melakukan absensi'
                });
              }
            } else {
              // Hari yang sudah lewat
              formattedData.push({
                tanggal: dateStr,
                jam_masuk: null,
                jam_keluar: null,
                status: 'Tidak Hadir',
                keterangan: 'Tidak hadir'
              });
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log('Presensi data:', formattedData);
      
      return res.json({
        success: true,
        data: formattedData
      });
    }

    // Get today's attendance
    const [todayRows] = await db.execute(
      'SELECT * FROM presensi WHERE id_user = ? AND tanggal LIKE ? ORDER BY tanggal DESC',
      [user_id, targetDate + '%']
    );

    // Get recent attendance history
    const [historyRows] = await db.execute(
      'SELECT * FROM presensi WHERE id_user = ? ORDER BY tanggal DESC LIMIT 10',
      [user_id]
    );

    res.json({
      success: true,
      data: {
        presensi_hari_ini: todayRows[0] || null,
        riwayat_presensi: historyRows
      }
    });

  } catch (error) {
    console.error('Get presensi error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const submitPresensi = async (req, res) => {
  try {
    const { user_id, jenis_presensi, latitude, longitude, foto, keterangan, tipe_lokasi, lokasi_id } = req.body;
    const fotoFile = req.file ? req.file.filename : null;

    console.log('📥 Received data:', {
      user_id,
      jenis_presensi,
      latitude,
      longitude,
      foto: fotoFile ? 'ada' : 'tidak ada',
      lokasi_id
    });

    if (!user_id || !jenis_presensi || !latitude || !longitude) {
      console.error('❌ Data tidak lengkap:', { user_id, jenis_presensi, latitude, longitude });
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }

    const db = await getConnection();

    // Validasi lokasi
    let lokasi_valid = false;
    let nama_lokasi = '';
    let jenis_lokasi_absen = 'tetap';
    let lokasi_id_valid = null;

    // Ambil semua lokasi yang aktif (kantor tetap + dinas aktif)
    const [lokasiRows] = await db.execute(
      'SELECT * FROM lokasi_kantor WHERE status = "aktif" AND is_active = 1'
    );

    // Cek apakah user berada di salah satu lokasi yang diizinkan
    for (const lokasi of lokasiRows) {
      const distance = calculateDistance(
        parseFloat(latitude), 
        parseFloat(longitude), 
        parseFloat(lokasi.lintang), 
        parseFloat(lokasi.bujur)
      );
      
      console.log(`Checking location: ${lokasi.nama_lokasi}, Distance: ${distance}m, Radius: ${lokasi.radius}m`);
      
      if (distance <= lokasi.radius) {
        lokasi_valid = true;
        nama_lokasi = lokasi.nama_lokasi;
        jenis_lokasi_absen = lokasi.jenis_lokasi;
        lokasi_id_valid = lokasi.id;
        console.log(`✓ Valid location: ${nama_lokasi}, ID: ${lokasi_id_valid}`);
        if (lokasi.jenis_lokasi === 'dinas') {
          nama_lokasi += ' (Dinas)';
        }
        break;
      }
    }

    if (!lokasi_valid) {
      return res.json({ success: false, message: 'Anda berada di luar radius lokasi yang diizinkan' });
    }

    // Gunakan waktu lokal Indonesia (WIB) - BUKAN UTC
    const now = new Date();
    
    // Format: YYYY-MM-DD HH:MM:SS (waktu lokal)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const tanggal = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const tanggal_only = `${year}-${month}-${day}`;
    const jam_sekarang = `${hours}:${minutes}:${seconds}`;
    
    console.log('Waktu lokal:', tanggal, '| Tanggal:', tanggal_only);

    // Cek apakah pegawai sedang terdaftar dinas hari ini
    const [dinasCheckRows] = await db.execute(`
      SELECT d.id_dinas
      FROM dinas d
      INNER JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
      WHERE dp.id_user = ?
        AND ? BETWEEN d.tanggal_mulai AND d.tanggal_selesai
        AND d.status = 'aktif'
        AND dp.status_konfirmasi = 'konfirmasi'
      LIMIT 1
    `, [user_id, tanggal_only]);
    
    // Jika terdaftar dinas, apapun lokasinya harus validasi
    const status_validasi = dinasCheckRows.length > 0 ? 'menunggu' : 'disetujui';

    // Tentukan status berdasarkan jam masuk dan hari
    let status = 'Hadir';
    if (jenis_presensi === 'masuk') {
      // Ambil batas absen untuk hari ini
      const hari_ini = now.toLocaleDateString('en-US', { weekday: 'long' });
      const hari_indonesia = {
        'Monday': 'Senin',
        'Tuesday': 'Selasa', 
        'Wednesday': 'Rabu',
        'Thursday': 'Kamis',
        'Friday': 'Jumat',
        'Saturday': 'Sabtu',
        'Sunday': 'Minggu'
      };
      
      const hari = hari_indonesia[hari_ini] || 'Senin';
      
      const [jamKerjaRows] = await db.execute(
        'SELECT batas_absen FROM jam_kerja_hari WHERE hari = ?',
        [hari]
      );
      
      // Cek apakah ada izin datang terlambat yang disetujui
      const [izinTerlambatRows] = await db.execute(`
        SELECT jam_mulai 
        FROM pengajuan 
        WHERE id_user = ? 
          AND jenis_pengajuan = 'izin_datang_terlambat'
          AND tanggal_mulai = ?
          AND status = 'disetujui'
        LIMIT 1
      `, [user_id, tanggal_only]);
      
      if (izinTerlambatRows.length > 0) {
        // Ada izin terlambat yang disetujui
        const jam_izin = izinTerlambatRows[0].jam_mulai;
        
        if (jam_sekarang <= jam_izin) {
          status = 'Hadir';
        } else {
          status = 'Terlambat';
        }
      } else if (jamKerjaRows.length > 0 && jam_sekarang > jamKerjaRows[0].batas_absen) {
        status = 'Terlambat';
      }
    }

    if (jenis_presensi === 'masuk') {
      // Check if already checked in today
      const [existingRows] = await db.execute(
        'SELECT id_presensi FROM presensi WHERE id_user = ? AND DATE(tanggal) = ? AND jam_masuk IS NOT NULL',
        [user_id, tanggal_only]
      );
      
      const [existingDinasRows] = await db.execute(
        'SELECT id FROM absen_dinas WHERE id_user = ? AND tanggal_absen = ? AND jam_masuk IS NOT NULL',
        [user_id, tanggal_only]
      );

      if (existingRows.length > 0 || existingDinasRows.length > 0) {
        return res.json({ success: false, message: 'Anda sudah melakukan presensi masuk hari ini' });
      }

      // PISAHKAN: Simpan ke absen_dinas atau presensi
      if (dinasCheckRows.length > 0) {
        // SEDANG DINAS → Simpan ke absen_dinas
        const id_dinas = dinasCheckRows[0].id_dinas;
        
        await db.execute(`
          INSERT INTO absen_dinas (
            id_dinas, id_user, tanggal_absen, jam_masuk, lintang_masuk, bujur_masuk, 
            foto_masuk, status, keterangan, status_validasi, lokasi_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id_dinas, user_id, tanggal_only, jam_sekarang, latitude, longitude, 
          fotoFile || null, status.toLowerCase(), keterangan || null, 'menunggu', lokasi_id_valid
        ]);
        
        console.log(`✓ Absen DINAS saved: id_dinas=${id_dinas}, lokasi_id=${lokasi_id_valid}`);
        
      } else {
        // TIDAK DINAS → Simpan ke presensi biasa
        try {
          await db.execute(`
            INSERT INTO presensi (
              id_user, tanggal, jam_masuk, lintang_masuk, bujur_masuk, foto_masuk, 
              alasan_luar_lokasi, status, status_validasi, lokasi_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user_id, tanggal, jam_sekarang, latitude, longitude, fotoFile || null, 
            keterangan || null, status, 'disetujui', lokasi_id_valid
          ]);
          
          console.log(`✓ Presensi BIASA saved: lokasi_id=${lokasi_id_valid}`);
        } catch (insertError) {
          // Handle duplicate entry error
          if (insertError.code === 'ER_DUP_ENTRY') {
            console.log('⚠️ Duplicate entry detected, user already checked in today');
            return res.json({ 
              success: true, 
              message: 'Anda sudah melakukan presensi masuk hari ini',
              already_checked_in: true
            });
          }
          throw insertError; // Re-throw jika bukan duplicate error
        }
      }

    } else { // keluar
      // Cek izin pulang cepat yang disetujui
      const [izinPulangCepatRows] = await db.execute(`
        SELECT jam_mulai 
        FROM pengajuan 
        WHERE id_user = ? 
          AND jenis_pengajuan = 'izin_pulang_cepat'
          AND tanggal_mulai = ?
          AND status = 'disetujui'
        LIMIT 1
      `, [user_id, tanggal_only]);
      
      // Ambil jam pulang normal
      const hari_ini = now.toLocaleDateString('en-US', { weekday: 'long' });
      const hari_indonesia = {
        'Monday': 'Senin',
        'Tuesday': 'Selasa', 
        'Wednesday': 'Rabu',
        'Thursday': 'Kamis',
        'Friday': 'Jumat',
        'Saturday': 'Sabtu',
        'Sunday': 'Minggu'
      };
      const hari = hari_indonesia[hari_ini] || 'Senin';
      
      const [jamKerjaRows] = await db.execute(
        'SELECT jam_pulang FROM jam_kerja_hari WHERE hari = ?',
        [hari]
      );
      
      if (izinPulangCepatRows.length > 0 && jamKerjaRows.length > 0) {
        // Ada izin pulang cepat yang disetujui
        const jam_izin_pulang = izinPulangCepatRows[0].jam_mulai;
        const jam_pulang_normal = jamKerjaRows[0].jam_pulang;
        
        // Jika pulang sebelum jam normal, tetap dianggap hadir karena ada izin
        if (jam_sekarang < jam_pulang_normal) {
          status = 'Hadir';
        }
      }
      
      // Update existing record (cek dinas atau presensi)
      if (dinasCheckRows.length > 0) {
        // Update absen_dinas
        const [result] = await db.execute(`
          UPDATE absen_dinas SET 
            jam_pulang = ?, lintang_pulang = ?, bujur_pulang = ?, foto_pulang = ?, keterangan = ? 
          WHERE id_user = ? AND tanggal_absen = ?
        `, [
          jam_sekarang, latitude, longitude, fotoFile || null, keterangan || nama_lokasi, 
          user_id, tanggal_only
        ]);
        
        console.log(`✓ Absen DINAS pulang updated`);
        
        if (result.affectedRows === 0) {
          return res.json({ success: false, message: 'Tidak ada data absen dinas masuk untuk hari ini' });
        }
      } else {
        // Update presensi biasa
        const [result] = await db.execute(`
          UPDATE presensi SET 
            jam_pulang = ?, lintang_pulang = ?, bujur_pulang = ?, foto_pulang = ?, lokasi_pulang = ? 
          WHERE id_user = ? AND tanggal LIKE ?
        `, [
          jam_sekarang, latitude, longitude, fotoFile || null, nama_lokasi, 
          user_id, tanggal_only + '%'
        ]);
        
        console.log(`✓ Presensi BIASA pulang updated`);
        
        if (result.affectedRows === 0) {
          return res.json({ success: false, message: 'Tidak ada data presensi masuk untuk hari ini' });
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Presensi ${jenis_presensi} berhasil di ${nama_lokasi}`,
      status_validasi: status_validasi,
      jenis_lokasi: jenis_lokasi_absen,
      nama_lokasi: nama_lokasi
    });

  } catch (error) {
    console.error('Submit presensi error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

// NEW: Get riwayat gabungan (presensi kantor + dinas)
const getRiwayatGabungan = async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.query;
    
    if (!user_id || !start_date || !end_date) {
      return res.json({ 
        success: false, 
        message: 'user_id, start_date, dan end_date diperlukan' 
      });
    }
    
    const db = await getConnection();
    
    // Query 1: Presensi Kantor
    const [presensiKantor] = await db.execute(`
      SELECT 
        p.tanggal,
        p.jam_masuk,
        p.jam_pulang as jam_keluar,
        p.status,
        'kantor' as jenis_presensi,
        p.status_validasi,
        lk.nama_lokasi as lokasi,
        NULL as kegiatan_dinas,
        CASE 
          WHEN peng.jenis_pengajuan IS NOT NULL 
          THEN CONCAT(
            CASE peng.jenis_pengajuan
              WHEN 'izin_datang_terlambat' THEN 'Izin Datang Terlambat'
              WHEN 'izin_pulang_cepat' THEN 'Izin Pulang Cepat'
              ELSE peng.jenis_pengajuan
            END,
            ': ', peng.alasan_text
          )
          ELSE NULL
        END as keterangan_izin
      FROM presensi p
      LEFT JOIN lokasi_kantor lk ON p.lokasi_id = lk.id
      LEFT JOIN pengajuan peng ON peng.id_user = p.id_user
        AND DATE(peng.tanggal_mulai) = DATE(p.tanggal)
        AND peng.status = 'disetujui'
        AND peng.jenis_pengajuan IN ('izin_datang_terlambat', 'izin_pulang_cepat')
      WHERE p.id_user = ?
        AND DATE(p.tanggal) BETWEEN ? AND ?
      ORDER BY p.tanggal DESC
    `, [user_id, start_date, end_date]);
    
    // Query 2: Presensi Dinas
    const [presensiDinas] = await db.execute(`
      SELECT 
        ad.tanggal_absen as tanggal,
        ad.jam_masuk,
        ad.jam_pulang as jam_keluar,
        ad.status,
        'dinas' as jenis_presensi,
        ad.status_validasi,
        lk.nama_lokasi as lokasi,
        d.nama_kegiatan as kegiatan_dinas
      FROM absen_dinas ad
      JOIN dinas d ON ad.id_dinas = d.id_dinas
      LEFT JOIN lokasi_kantor lk ON ad.lokasi_id = lk.id
      WHERE ad.id_user = ?
        AND ad.tanggal_absen BETWEEN ? AND ?
      ORDER BY ad.tanggal_absen DESC
    `, [user_id, start_date, end_date]);
    
    // Gabungkan dan sort by tanggal
    const gabungan = [...presensiKantor, ...presensiDinas].sort((a, b) => {
      return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
    });
    
    return res.json({
      success: true,
      data: gabungan
    });
  } catch (error) {
    console.error('Get riwayat gabungan error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Check dinas attendance today
const checkDinasAttendance = async (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    if (!user_id || !date) {
      return res.json({ success: false, has_checked_in: false });
    }
    
    const db = await getConnection();
    
    const [rows] = await db.execute(`
      SELECT jam_masuk, status_validasi
      FROM absen_dinas
      WHERE id_user = ? AND tanggal_absen = ? AND jam_masuk IS NOT NULL
      LIMIT 1
    `, [user_id, date]);
    
    if (rows.length > 0) {
      return res.json({
        success: true,
        has_checked_in: true,
        check_in_time: rows[0].jam_masuk,
        status_validasi: rows[0].status_validasi
      });
    }
    
    return res.json({
      success: true,
      has_checked_in: false
    });
  } catch (error) {
    console.error('Check dinas attendance error:', error);
    return res.json({ success: false, has_checked_in: false });
  }
};

module.exports = { getPresensi, submitPresensi, checkDinasStatus, getRiwayatGabungan, checkDinasAttendance };


// Admin: Get all presensi today
const getAllPresensiToday = async (req, res) => {
  try {
    const { tanggal } = req.query;
    const targetDate = tanggal || new Date().toISOString().split('T')[0];
    
    const db = await getConnection();
    
    // Get all presensi for today
    const [rows] = await db.execute(`
      SELECT 
        p.id_presensi,
        p.id_user,
        p.tanggal,
        TIME_FORMAT(p.jam_masuk, '%H:%i:%s') as jam_masuk,
        TIME_FORMAT(p.jam_pulang, '%H:%i:%s') as jam_pulang,
        p.status,
        pg.nama_lengkap,
        pg.nip
      FROM presensi p
      JOIN users u ON p.id_user = u.id_user
      JOIN pegawai pg ON u.id_user = pg.id_user
      WHERE DATE(p.tanggal) = ?
      ORDER BY p.jam_masuk DESC
    `, [targetDate]);
    
    return res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get all presensi today error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Get all presensi (history)
const getAllPresensi = async (req, res) => {
  try {
    const db = await getConnection();
    
    const [rows] = await db.execute(`
      SELECT 
        p.id_presensi,
        p.id_user,
        DATE_FORMAT(p.tanggal, '%Y-%m-%d') as tanggal,
        TIME_FORMAT(p.jam_masuk, '%H:%i:%s') as jam_masuk,
        TIME_FORMAT(p.jam_pulang, '%H:%i:%s') as jam_pulang,
        p.status,
        pg.nama_lengkap,
        pg.nip
      FROM presensi p
      JOIN users u ON p.id_user = u.id_user
      JOIN pegawai pg ON u.id_user = pg.id_user
      ORDER BY p.tanggal DESC, p.jam_masuk DESC
      LIMIT 100
    `);
    
    return res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get all presensi error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { getPresensi, submitPresensi, checkDinasStatus, checkWorkDay, getRiwayatGabungan, checkDinasAttendance, getAllPresensiToday, getAllPresensi };
