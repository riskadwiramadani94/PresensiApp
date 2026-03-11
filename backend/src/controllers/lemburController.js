const { getConnection } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer untuk upload foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/lembur');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `lembur-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Get detail lembur berdasarkan ID pengajuan
exports.getDetailLembur = async (req, res) => {
  try {
    const { id_pengajuan, user_id } = req.query;
    const db = await getConnection();

    // Query untuk mendapatkan detail pengajuan lembur (tanpa lokasi)
    const pengajuanQuery = `
      SELECT 
        p.id_pengajuan,
        DATE_FORMAT(p.tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
        DATE_FORMAT(p.tanggal_selesai, '%Y-%m-%d') as tanggal_selesai,
        p.jam_mulai,
        p.jam_selesai,
        p.alasan_text,
        p.status
      FROM pengajuan p
      WHERE p.id_pengajuan = ?
        AND p.id_user = ?
        AND p.jenis_pengajuan = 'lembur'
        AND p.status = 'disetujui'
    `;

    const [pengajuanResults] = await db.query(pengajuanQuery, [id_pengajuan, user_id]);

    if (pengajuanResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Data lembur tidak ditemukan' });
    }

    const lembur = pengajuanResults[0];

    const formattedResult = {
      ...lembur,
      // Tanggal sudah dalam format string dari MySQL DATE_FORMAT
      tanggal_mulai: lembur.tanggal_mulai,
      tanggal_selesai: lembur.tanggal_selesai
    };

    res.json({ success: true, data: formattedResult });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get absen lembur berdasarkan tanggal
exports.getAbsenLemburByTanggal = async (req, res) => {
  try {
    const { id, user_id, tanggal } = req.query;
    const db = await getConnection();

    const query = `
      SELECT 
        al.*
      FROM absen_lembur al
      WHERE al.id_pengajuan = ?
        AND al.id_user = ?
        AND al.tanggal = ?
    `;

    const [results] = await db.query(query, [id, user_id, tanggal]);

    if (results.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: results[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get lokasi terdekat dari posisi user
exports.getLokasiTerdekat = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const db = await getConnection();

    const query = `
      SELECT 
        id_lokasi_kantor,
        nama_lokasi,
        lintang as latitude,
        bujur as longitude,
        radius,
        (
          6371000 * acos(
            cos(radians(?)) * cos(radians(lintang)) * 
            cos(radians(bujur) - radians(?)) + 
            sin(radians(?)) * sin(radians(lintang))
          )
        ) AS distance
      FROM lokasi_kantor
      WHERE jenis_lokasi = 'tetap' 
        AND is_active = 1
      ORDER BY distance ASC
      LIMIT 1
    `;

    const [results] = await db.query(query, [latitude, longitude, latitude]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Tidak ada lokasi kantor yang tersedia' });
    }

    const lokasi = results[0];
    res.json({
      success: true,
      data: {
        id_lokasi_kantor: lokasi.id_lokasi_kantor,
        nama_lokasi: lokasi.nama_lokasi,
        latitude: parseFloat(lokasi.latitude),
        longitude: parseFloat(lokasi.longitude),
        radius: lokasi.radius,
        distance: Math.round(lokasi.distance)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get pengajuan lembur yang disetujui untuk hari ini
exports.getPengajuanLemburHariIni = async (req, res) => {
  try {
    const { user_id } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const db = await getConnection();

    const query = `
      SELECT 
        p.id_pengajuan,
        DATE_FORMAT(p.tanggal_mulai, '%Y-%m-%d') as tanggal_mulai,
        DATE_FORMAT(p.tanggal_selesai, '%Y-%m-%d') as tanggal_selesai,
        p.jam_mulai,
        p.jam_selesai,
        p.alasan_text,
        p.status
      FROM pengajuan p
      WHERE p.id_user = ?
        AND p.jenis_pengajuan = 'lembur'
        AND p.status = 'disetujui'
        AND ? BETWEEN DATE(p.tanggal_mulai) AND DATE(p.tanggal_selesai)
    `;

    const [results] = await db.query(query, [user_id, today]);
    
    // Format tanggal untuk menghindari timezone
    const formattedResults = results.map(item => ({
      ...item,
      // Tanggal sudah dalam format string dari MySQL
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai
    }));
    
    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get lokasi untuk absen lembur
exports.getLokasiLembur = async (req, res) => {
  try {
    const { user_id, tanggal } = req.query;
    const db = await getConnection();

    // Cek apakah pegawai sedang dinas
    const dinasQuery = `
      SELECT 
        d.id_dinas,
        d.nama_kegiatan,
        lk.id_lokasi_kantor,
        lk.nama_lokasi,
        lk.lintang,
        lk.bujur,
        lk.radius,
        'dinas' as jenis_lokasi
      FROM dinas_pegawai dp
      JOIN dinas d ON dp.id_dinas = d.id_dinas
      JOIN dinas_lokasi dl ON d.id_dinas = dl.id_dinas AND dl.is_lokasi_utama = 1
      JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id_lokasi_kantor
      WHERE dp.id_user = ?
        AND ? BETWEEN d.tanggal_mulai AND d.tanggal_selesai
        AND dp.status_konfirmasi = 'konfirmasi'
        AND d.status = 'aktif'
      LIMIT 1
    `;

    const [dinasResults] = await db.query(dinasQuery, [user_id, tanggal]);

    if (dinasResults.length > 0) {
      // Sedang dinas
      return res.json({
        success: true,
        data: {
          lokasi_id: dinasResults[0].id_lokasi_kantor,
          nama_lokasi: dinasResults[0].nama_lokasi,
          latitude: parseFloat(dinasResults[0].lintang),
          longitude: parseFloat(dinasResults[0].bujur),
          radius: dinasResults[0].radius,
          jenis: 'dinas',
          dinas_id: dinasResults[0].id_dinas
        }
      });
    }

    // Tidak sedang dinas, ambil lokasi kantor utama
    const kantorQuery = `
      SELECT 
        id_lokasi_kantor,
        nama_lokasi,
        lintang,
        bujur,
        radius,
        'kantor' as jenis_lokasi
      FROM lokasi_kantor
      WHERE jenis_lokasi = 'tetap' 
        AND is_active = 1
      ORDER BY id_lokasi_kantor ASC
      LIMIT 1
    `;

    const [kantorResults] = await db.query(kantorQuery);

    if (kantorResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Lokasi kantor tidak ditemukan' });
    }

    res.json({
      success: true,
      data: {
        lokasi_id: kantorResults[0].id_lokasi_kantor,
        nama_lokasi: kantorResults[0].nama_lokasi,
        latitude: parseFloat(kantorResults[0].lintang),
        longitude: parseFloat(kantorResults[0].bujur),
        radius: kantorResults[0].radius,
        jenis: 'kantor',
        dinas_id: null
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get list absen lembur aktif
exports.getAbsenLemburAktif = async (req, res) => {
  try {
    const { user_id } = req.query;
    const db = await getConnection();

    const query = `
      SELECT 
        al.*,
        p.tanggal_mulai,
        p.tanggal_selesai,
        p.jam_mulai as jam_rencana_mulai,
        p.jam_selesai as jam_rencana_selesai,
        p.alasan_text,
        lk.nama_lokasi,
        lk.lintang as latitude,
        lk.bujur as longitude,
        lk.radius
      FROM absen_lembur al
      JOIN pengajuan p ON al.id_pengajuan = p.id_pengajuan
      JOIN lokasi_kantor lk ON al.id_lokasi_kantor = lk.id_lokasi_kantor
      WHERE al.id_user = ?
        AND al.status = 'masuk'
      ORDER BY al.tanggal DESC, al.jam_masuk DESC
    `;

    const [results] = await db.query(query, [user_id]);

    const formattedResults = results.map(item => {
      // Format tanggal yang konsisten
      const formatDateSafe = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateValue;
        }
        const date = new Date(dateValue);
        return date.toISOString().substring(0, 10);
      };
      
      return {
        ...item,
        tanggal: formatDateSafe(item.tanggal),
        tanggal_mulai: formatDateSafe(item.tanggal_mulai),
        tanggal_selesai: formatDateSafe(item.tanggal_selesai),
        lokasi_detail: item.nama_lokasi,
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude)
      };
    });

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get riwayat lembur
exports.getRiwayatLembur = async (req, res) => {
  try {
    const { user_id } = req.query;
    const db = await getConnection();

    const query = `
      SELECT 
        al.*,
        p.jam_mulai as jam_rencana_mulai,
        p.jam_selesai as jam_rencana_selesai,
        p.alasan_text,
        lk.nama_lokasi,
        lk.lintang as latitude,
        lk.bujur as longitude,
        lk.radius
      FROM absen_lembur al
      JOIN pengajuan p ON al.id_pengajuan = p.id_pengajuan
      JOIN lokasi_kantor lk ON al.id_lokasi_kantor = lk.id_lokasi_kantor
      WHERE al.id_user = ?
        AND al.status = 'selesai'
      ORDER BY al.tanggal DESC, al.jam_pulang DESC
      LIMIT 50
    `;

    const [results] = await db.query(query, [user_id]);

    const formattedResults = results.map(item => {
      const formatDateSafe = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateValue;
        }
        const date = new Date(dateValue);
        return date.toISOString().substring(0, 10);
      };
      
      return {
        ...item,
        tanggal: formatDateSafe(item.tanggal),
        lokasi_detail: item.nama_lokasi,
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude)
      };
    });

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Absen masuk lembur
exports.absenMasukLembur = [
  upload.single('foto'),
  async (req, res) => {
    try {
      const { id_pengajuan, user_id, latitude, longitude, tanggal } = req.body;
      const foto = req.file ? req.file.filename : null;
      const currentDate = tanggal || new Date().toISOString().split('T')[0];
      const jam_masuk = new Date().toTimeString().split(' ')[0];
      const db = await getConnection();

      // Cek apakah sudah absen masuk hari ini
      const checkQuery = `
        SELECT id_absen_lembur 
        FROM absen_lembur 
        WHERE id_pengajuan = ? 
          AND tanggal = ?
          AND jam_masuk IS NOT NULL
      `;

      const [checkResults] = await db.query(checkQuery, [id_pengajuan, currentDate]);

      if (checkResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Anda sudah absen masuk lembur hari ini' 
        });
      }

      // Cari lokasi terdekat dari posisi pegawai (seperti presensi biasa)
      const lokasiQuery = `
        SELECT 
          id_lokasi_kantor,
          nama_lokasi,
          lintang,
          bujur,
          radius,
          (
            6371000 * acos(
              cos(radians(?)) * cos(radians(lintang)) * 
              cos(radians(bujur) - radians(?)) + 
              sin(radians(?)) * sin(radians(lintang))
            )
          ) AS distance
        FROM lokasi_kantor
        WHERE jenis_lokasi = 'tetap' 
          AND is_active = 1
        HAVING distance <= radius
        ORDER BY distance ASC
        LIMIT 1
      `;

      const [lokasiResults] = await db.query(lokasiQuery, [latitude, longitude, latitude]);

      if (lokasiResults.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Anda berada di luar radius semua lokasi kantor yang tersedia' 
        });
      }

      const lokasi = lokasiResults[0];

      // Insert absen masuk
      const insertQuery = `
        INSERT INTO absen_lembur (
          id_pengajuan, id_user, tanggal, jam_masuk,
          lintang_masuk, bujur_masuk, foto_masuk,
          id_lokasi_kantor, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'masuk')
      `;

      const [result] = await db.query(
        insertQuery,
        [id_pengajuan, user_id, currentDate, jam_masuk, latitude, longitude, foto, lokasi.id_lokasi_kantor]
      );

      res.json({
        success: true,
        message: `Absen masuk lembur berhasil di ${lokasi.nama_lokasi}`,
        data: {
          id_absen_lembur: result.insertId,
          jam_masuk: jam_masuk,
          lokasi: lokasi.nama_lokasi
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
];

// Absen pulang lembur
exports.absenPulangLembur = [
  upload.single('foto'),
  async (req, res) => {
    try {
      const { id_absen_lembur, latitude, longitude } = req.body;
      const foto = req.file ? req.file.filename : null;
      const jam_pulang = new Date().toTimeString().split(' ')[0];
      const db = await getConnection();

      // Get data absen masuk dan lokasi
      const getQuery = `
        SELECT 
          al.jam_masuk,
          lk.id_lokasi_kantor,
          lk.nama_lokasi,
          lk.lintang,
          lk.bujur,
          lk.radius
        FROM absen_lembur al
        JOIN lokasi_kantor lk ON al.id_lokasi_kantor = lk.id_lokasi_kantor
        WHERE al.id_absen_lembur = ?
      `;

      const [results] = await db.query(getQuery, [id_absen_lembur]);

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Data absen tidak ditemukan' });
      }

      const absenData = results[0];
      const jam_masuk = absenData.jam_masuk;

      // Cari lokasi terdekat untuk absen pulang (bisa berbeda dari lokasi masuk)
      const lokasiQuery = `
        SELECT 
          id_lokasi_kantor,
          nama_lokasi,
          lintang,
          bujur,
          radius,
          (
            6371000 * acos(
              cos(radians(?)) * cos(radians(lintang)) * 
              cos(radians(bujur) - radians(?)) + 
              sin(radians(?)) * sin(radians(lintang))
            )
          ) AS distance
        FROM lokasi_kantor
        WHERE jenis_lokasi = 'tetap' 
          AND is_active = 1
        HAVING distance <= radius
        ORDER BY distance ASC
        LIMIT 1
      `;

      const [lokasiResults] = await db.query(lokasiQuery, [latitude, longitude, latitude]);

      if (lokasiResults.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Anda berada di luar radius semua lokasi kantor yang tersedia' 
        });
      }

      // Hitung total jam
      const masuk = new Date(`1970-01-01T${jam_masuk}`);
      const pulang = new Date(`1970-01-01T${jam_pulang}`);
      let diffMs = pulang - masuk;
      
      // Jika melewati tengah malam
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }
      
      const total_jam = (diffMs / (1000 * 60 * 60)).toFixed(2);

      // Update absen pulang
      const updateQuery = `
        UPDATE absen_lembur 
        SET jam_pulang = ?,
            lintang_pulang = ?,
            bujur_pulang = ?,
            foto_pulang = ?,
            total_jam = ?,
            status = 'selesai'
        WHERE id_absen_lembur = ?
      `;

      await db.query(
        updateQuery,
        [jam_pulang, latitude, longitude, foto, total_jam, id_absen_lembur]
      );

      const lokasi = lokasiResults[0];

      res.json({
        success: true,
        message: `Absen pulang lembur berhasil di ${lokasi.nama_lokasi}`,
        data: {
          jam_pulang: jam_pulang,
          total_jam: parseFloat(total_jam),
          lokasi: lokasi.nama_lokasi
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
];
