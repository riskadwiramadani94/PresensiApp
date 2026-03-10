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

// Get pengajuan lembur yang disetujui untuk hari ini
exports.getPengajuanLemburHariIni = async (req, res) => {
  try {
    const { user_id } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const db = await getConnection();

    const query = `
      SELECT 
        p.id_pengajuan,
        p.tanggal_mulai,
        p.tanggal_selesai,
        p.jam_mulai,
        p.jam_selesai,
        p.alasan_text,
        p.status
      FROM pengajuan p
      WHERE p.id_user = ?
        AND p.jenis_pengajuan = 'lembur'
        AND p.status = 'disetujui'
        AND ? BETWEEN p.tanggal_mulai AND p.tanggal_selesai
    `;

    const [results] = await db.query(query, [user_id, today]);
    res.json({ success: true, data: results });
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
        lk.id,
        lk.nama_lokasi,
        lk.lintang,
        lk.bujur,
        lk.radius,
        'dinas' as jenis_lokasi
      FROM dinas_pegawai dp
      JOIN dinas d ON dp.id_dinas = d.id_dinas
      JOIN dinas_lokasi dl ON d.id_dinas = dl.id_dinas AND dl.is_lokasi_utama = 1
      JOIN lokasi_kantor lk ON dl.id_lokasi = lk.id
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
          lokasi_id: dinasResults[0].id,
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
        id,
        nama_lokasi,
        lintang,
        bujur,
        radius,
        'kantor' as jenis_lokasi
      FROM lokasi_kantor
      WHERE jenis_lokasi = 'tetap' 
        AND is_active = 1
      ORDER BY id ASC
      LIMIT 1
    `;

    const [kantorResults] = await db.query(kantorQuery);

    if (kantorResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Lokasi kantor tidak ditemukan' });
    }

    res.json({
      success: true,
      data: {
        lokasi_id: kantorResults[0].id,
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
      JOIN lokasi_kantor lk ON al.lokasi_id = lk.id
      WHERE al.id_user = ?
        AND al.status = 'masuk'
      ORDER BY al.tanggal DESC, al.jam_masuk DESC
    `;

    const [results] = await db.query(query, [user_id]);

    const formattedResults = results.map(item => ({
      ...item,
      tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : null,
      tanggal_mulai: item.tanggal_mulai ? new Date(item.tanggal_mulai).toISOString().split('T')[0] : null,
      tanggal_selesai: item.tanggal_selesai ? new Date(item.tanggal_selesai).toISOString().split('T')[0] : null,
      lokasi_detail: item.nama_lokasi,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude)
    }));

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
      JOIN lokasi_kantor lk ON al.lokasi_id = lk.id
      WHERE al.id_user = ?
        AND al.status = 'selesai'
      ORDER BY al.tanggal DESC, al.jam_pulang DESC
      LIMIT 50
    `;

    const [results] = await db.query(query, [user_id]);

    const formattedResults = results.map(item => ({
      ...item,
      tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : null,
      lokasi_detail: item.nama_lokasi,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude)
    }));

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
      const { id_pengajuan, user_id, latitude, longitude, lokasi_id, dinas_id } = req.body;
      const foto = req.file ? req.file.filename : null;
      const tanggal = new Date().toISOString().split('T')[0];
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

      const [checkResults] = await db.query(checkQuery, [id_pengajuan, tanggal]);

      if (checkResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Anda sudah absen masuk lembur hari ini' 
        });
      }

      // Tentukan lokasi_lembur dan dinas_id
      const lokasi_lembur = dinas_id ? 'dinas' : 'kantor';

      // Insert absen masuk
      const insertQuery = `
        INSERT INTO absen_lembur (
          id_pengajuan, id_user, tanggal, jam_masuk,
          lintang_masuk, bujur_masuk, foto_masuk,
          lokasi_lembur, lokasi_id, dinas_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'masuk')
      `;

      const [result] = await db.query(
        insertQuery,
        [id_pengajuan, user_id, tanggal, jam_masuk, latitude, longitude, foto, lokasi_lembur, lokasi_id, dinas_id || null]
      );

      res.json({
        success: true,
        message: 'Absen masuk lembur berhasil',
        data: {
          id_absen_lembur: result.insertId,
          jam_masuk: jam_masuk
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

      // Get data absen masuk
      const getQuery = `
        SELECT jam_masuk 
        FROM absen_lembur 
        WHERE id_absen_lembur = ?
      `;

      const [results] = await db.query(getQuery, [id_absen_lembur]);

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Data absen tidak ditemukan' });
      }

      const jam_masuk = results[0].jam_masuk;

      // Hitung total jam
      const masuk = new Date(`1970-01-01T${jam_masuk}`);
      const pulang = new Date(`1970-01-01T${jam_pulang}`);
      const diffMs = pulang - masuk;
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

      res.json({
        success: true,
        message: 'Absen pulang lembur berhasil',
        data: {
          jam_pulang: jam_pulang,
          total_jam: parseFloat(total_jam)
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
];

module.exports = exports;
