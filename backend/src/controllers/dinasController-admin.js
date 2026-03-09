const { getConnection } = require('../config/database');
const multer = require('multer');
const path = require('path');

// Setup multer untuk upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/spt/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'SPT-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed!'));
    }
  }
});

const uploadSPT = upload.single('dokumen_spt');

const getDinasAktifAdmin = async (req, res) => {
  try {
    console.log('Getting dinas aktif data...');
    const { status, tanggal } = req.query;
    const db = await getConnection();

    let whereClause = '';
    const today = new Date().toISOString().split('T')[0];
    const filterDate = tanggal || today;
    
    // Filter berdasarkan status jika ada
    if (status) {
      switch (status) {
        case 'berlangsung':
          whereClause = `WHERE DATE(d.tanggal_mulai) <= '${today}' AND DATE(d.tanggal_selesai) >= '${today}'`;
          break;
        case 'selesai':
          whereClause = `WHERE DATE(d.tanggal_selesai) < '${today}'`;
          break;
        case 'belum_dimulai':
          whereClause = `WHERE DATE(d.tanggal_mulai) > '${today}'`;
          break;
      }
    }

    const [rows] = await db.execute(`
      SELECT d.*, 
             COUNT(dp.id) as total_pegawai,
             SUM(CASE WHEN p.status = 'Hadir' OR p.status = 'Terlambat' THEN 1 ELSE 0 END) as hadir_count
      FROM dinas d 
      LEFT JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas 
      LEFT JOIN presensi p ON d.id_dinas = p.dinas_id AND dp.id_user = p.id_user AND p.jenis_presensi = 'dinas'
      ${whereClause}
      GROUP BY d.id_dinas 
      ORDER BY d.tanggal_mulai DESC
    `);

    console.log('Found', rows.length, 'dinas records');
    const dinas_list = [];

    for (const row of rows) {
      // Get lokasi details for this dinas
      let lokasiRows = [];
      try {
        const [rows] = await db.execute(`
          SELECT lk.id, lk.nama_lokasi, lk.alamat, lk.lintang, lk.bujur, lk.radius, dl.is_lokasi_utama
          FROM dinas_lokasi dl
          JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
          WHERE dl.id_dinas = ? AND lk.is_active = 1
          ORDER BY dl.urutan
        `, [row.id_dinas]);
        lokasiRows = rows;
      } catch (err) {
        console.log('Lokasi query error, trying fallback:', err.message);
        lokasiRows = [];
      }

      // Get pegawai details for this dinas with specific date filter
      const [pegawaiRows] = await db.execute(`
        SELECT dp.*, pg.nama_lengkap, pg.nip,
               pr.id_presensi as absen_id,
               pr.jam_masuk, pr.jam_pulang, pr.status as absen_status,
               pr.foto_masuk, pr.foto_pulang, 
               pr.status_validasi, pr.status_validasi_masuk, pr.status_validasi_pulang,
               pr.lintang_masuk, pr.bujur_masuk, pr.lintang_pulang, pr.bujur_pulang,
               lk.nama_lokasi as lokasi_absen
        FROM dinas_pegawai dp 
        JOIN users u ON dp.id_user = u.id_user
        JOIN pegawai pg ON u.id_user = pg.id_user
        LEFT JOIN presensi pr ON dp.id_dinas = pr.dinas_id 
          AND dp.id_user = pr.id_user 
          AND DATE(pr.tanggal) = ?
          AND pr.jenis_presensi = 'dinas'
        LEFT JOIN lokasi_kantor lk ON pr.lokasi_id = lk.id
        WHERE dp.id_dinas = ?
      `, [filterDate, row.id_dinas]);

      const pegawai = pegawaiRows.map(pegawaiRow => {
        let status = 'belum_absen';
        if (pegawaiRow.absen_status === 'hadir' || pegawaiRow.absen_status === 'terlambat') {
          status = 'hadir';
        }

        let fotoMasukUrl = null;
        let fotoPulangUrl = null;
        if (pegawaiRow.foto_masuk) {
          fotoMasukUrl = `http://${process.env.HOST}:${process.env.PORT}/uploads/presensi/${pegawaiRow.foto_masuk}`;
        }
        if (pegawaiRow.foto_pulang) {
          fotoPulangUrl = `http://${process.env.HOST}:${process.env.PORT}/uploads/presensi/${pegawaiRow.foto_pulang}`;
        }

        // Hitung apakah lokasi sesuai radius
        let isLokasiSesuai = false;
        if (pegawaiRow.lintang_masuk && pegawaiRow.bujur_masuk && lokasiRows.length > 0) {
          for (const lokasi of lokasiRows) {
            const distance = calculateDistance(
              parseFloat(pegawaiRow.lintang_masuk),
              parseFloat(pegawaiRow.bujur_masuk),
              parseFloat(lokasi.lintang),
              parseFloat(lokasi.bujur)
            );
            if (distance <= lokasi.radius) {
              isLokasiSesuai = true;
              break;
            }
          }
        }

        return {
          absenId: pegawaiRow.absen_id,
          nama: pegawaiRow.nama_lengkap,
          nip: pegawaiRow.nip,
          status: status,
          // Data lama untuk backward compatibility
          jamAbsen: pegawaiRow.jam_masuk,
          fotoAbsen: fotoMasukUrl,
          // Data baru untuk validasi terpisah
          jam_masuk: pegawaiRow.jam_masuk,
          jam_pulang: pegawaiRow.jam_pulang,
          foto_masuk: fotoMasukUrl,
          foto_pulang: fotoPulangUrl,
          lokasiAbsen: pegawaiRow.lokasi_absen,
          isLokasiSesuai: isLokasiSesuai,
          // Status validasi lama dan baru
          statusValidasi: pegawaiRow.status_validasi,
          status_validasi_masuk: pegawaiRow.status_validasi_masuk,
          status_validasi_pulang: pegawaiRow.status_validasi_pulang
        };
      });

      dinas_list.push({
        id: row.id_dinas,
        namaKegiatan: row.nama_kegiatan,
        nomorSpt: row.nomor_spt,
        jenisDinas: row.jenis_dinas,
        lokasi: lokasiRows.length > 0 
          ? lokasiRows.map(l => l.nama_lokasi).join(', ') 
          : 'Belum ada lokasi terdaftar',
        lokasi_list: lokasiRows.map(l => ({
          id: l.id,
          nama_lokasi: l.nama_lokasi,
          alamat: l.alamat,
          latitude: parseFloat(l.lintang),
          longitude: parseFloat(l.bujur),
          radius: l.radius,
          is_lokasi_utama: l.is_lokasi_utama
        })),
        jamKerja: `${row.jam_mulai || '08:00'} - ${row.jam_selesai || '17:00'}`,
        jam_mulai: row.jam_mulai,
        jam_selesai: row.jam_selesai,
        radius: row.radius_absen,
        koordinat_lat: parseFloat(row.lintang),
        koordinat_lng: parseFloat(row.bujur),
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        deskripsi: row.deskripsi,
        dokumen_spt: row.dokumen_spt,
        created_at: row.created_at,
        created_by: row.created_by,
        pegawai: pegawai
      });
    }

    res.json({
      success: true,
      data: dinas_list
    });

  } catch (error) {
    console.error('Get dinas aktif error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const createDinasAdmin = async (req, res) => {
  let connection;
  try {
    const { nama_kegiatan, nomor_spt, tanggal_mulai, tanggal_selesai, jenis_dinas, deskripsi, jam_mulai, jam_selesai } = req.body;
    
    // Parse array dari JSON string (karena FormData)
    let pegawai_ids, lokasi_ids;
    try {
      pegawai_ids = JSON.parse(req.body.pegawai_ids);
      lokasi_ids = JSON.parse(req.body.lokasi_ids);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid array format for pegawai_ids or lokasi_ids'
      });
    }
    
    // Tentukan tipe_jam_kerja berdasarkan jam_mulai & jam_selesai
    const tipe_jam_kerja = (jam_mulai && jam_selesai) ? 'custom' : 'default';
    
    // Get file info dari multer
    const dokumen_spt = req.file ? req.file.filename : null;
    console.log('📄 Dokumen SPT:', dokumen_spt);
    console.log('⏰ Tipe Jam Kerja:', tipe_jam_kerja);

    // Validate required fields
    const required_fields = ['nama_kegiatan', 'nomor_spt', 'tanggal_mulai', 'tanggal_selesai', 'pegawai_ids', 'lokasi_ids'];
    for (const field of required_fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        return res.status(400).json({
          success: false,
          message: `Field '${field}' wajib diisi`
        });
      }
    }

    if (!Array.isArray(pegawai_ids) || pegawai_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimal pilih 1 pegawai untuk dinas'
      });
    }

    if (!Array.isArray(lokasi_ids) || lokasi_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'WAJIB pilih minimal 1 lokasi dinas! Tidak boleh kosong.'
      });
    }

    const db = await getConnection();
    connection = await db.getConnection();

    // Get valid admin user ID for created_by
    const [adminRows] = await connection.execute('SELECT id_user FROM users WHERE role = "admin" ORDER BY id_user LIMIT 1');
    let adminUser = adminRows[0];

    if (!adminUser) {
      const [userRows] = await connection.execute('SELECT id_user FROM users ORDER BY id_user LIMIT 1');
      adminUser = userRows[0];
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'No users found in database'
        });
      }
    }

    // Validate pegawai_ids
    const placeholders = pegawai_ids.map(() => '?').join(',');
    const [validUsers] = await connection.execute(`SELECT id_user FROM users WHERE id_user IN (${placeholders})`, pegawai_ids);

    if (validUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid pegawai IDs found in database'
      });
    }

    // Validate lokasi_ids
    const lokasiPlaceholders = lokasi_ids.map(() => '?').join(',');
    const [validLokasi] = await connection.execute(`SELECT id FROM lokasi_kantor WHERE id IN (${lokasiPlaceholders}) AND is_active = 1`, lokasi_ids);

    if (validLokasi.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid lokasi IDs found in database'
      });
    }

    await connection.beginTransaction();

    try {
      // Insert dinas data dengan dokumen_spt dan tipe_jam_kerja
      const [result] = await connection.execute(`
        INSERT INTO dinas (
          nama_kegiatan, nomor_spt, jenis_dinas, tanggal_mulai, tanggal_selesai,
          tipe_jam_kerja, jam_mulai, jam_selesai, deskripsi, dokumen_spt, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?, NOW())
      `, [
        nama_kegiatan.trim(),
        nomor_spt.trim(),
        jenis_dinas || 'lokal',
        tanggal_mulai,
        tanggal_selesai,
        tipe_jam_kerja,
        jam_mulai || null,
        jam_selesai || null,
        deskripsi || '',
        dokumen_spt,
        adminUser.id_user
      ]);

      const dinas_id = result.insertId;

      // Insert lokasi dinas relationships
      for (let i = 0; i < validLokasi.length; i++) {
        await connection.execute(`
          INSERT INTO dinas_lokasi (id_dinas, id_lokasi_kantor, id_lokasi, urutan, is_lokasi_utama)
          VALUES (?, ?, ?, ?, ?)
        `, [dinas_id, validLokasi[i].id, validLokasi[i].id, i + 1, i === 0 ? 1 : 0]);
      }

      // Insert pegawai dinas relationships
      for (const user of validUsers) {
        await connection.execute(`
          INSERT INTO dinas_pegawai (id_dinas, id_user, status_konfirmasi, tanggal_konfirmasi)
          VALUES (?, ?, 'konfirmasi', NOW())
        `, [dinas_id, user.id_user]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Data dinas berhasil disimpan',
        data: {
          dinas_id: dinas_id,
          nama_kegiatan: nama_kegiatan,
          nomor_spt: nomor_spt
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Create dinas error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getRiwayatDinasAdmin = async (req, res) => {
  try {
    const db = await getConnection();

    const [rows] = await db.execute(`
      SELECT d.*, 
             COUNT(dp.id) as total_pegawai,
             SUM(CASE WHEN pr.status = 'Hadir' THEN 1 ELSE 0 END) as hadir_count
      FROM dinas d 
      LEFT JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas 
      LEFT JOIN presensi pr ON d.id_dinas = pr.dinas_id AND dp.id_user = pr.id_user AND pr.jenis_presensi = 'dinas'
      WHERE d.status IN ('selesai', 'dibatalkan')
      GROUP BY d.id_dinas 
      ORDER BY d.tanggal_mulai DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get riwayat dinas error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getValidasiAbsenAdmin = async (req, res) => {
  try {
    const db = await getConnection();

    const [rows] = await db.execute(`
      SELECT pr.*, pg.nama_lengkap, pg.nip, d.nama_kegiatan
      FROM presensi pr
      JOIN users u ON pr.id_user = u.id_user
      JOIN pegawai pg ON u.id_user = pg.id_user
      JOIN dinas d ON pr.dinas_id = d.id_dinas
      WHERE pr.jenis_presensi = 'dinas'
      ORDER BY pr.tanggal DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get validasi absen error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getDinasStats = async (req, res) => {
  try {
    const db = await getConnection();
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Count active dinas (dinas that are ongoing today)
    const [dinasAktifRows] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM dinas 
      WHERE DATE(tanggal_mulai) <= ? 
      AND (DATE(tanggal_selesai) >= ? OR tanggal_selesai IS NULL)
      AND status = 'aktif'
    `, [today, today]);
    
    // Count completed dinas today
    const [selesaiDinasRows] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM dinas 
      WHERE DATE(tanggal_selesai) = ? 
      AND status = 'selesai'
    `, [today]);
    
    // Count total employees on dinas today
    const [pegawaiDinasRows] = await db.execute(`
      SELECT COUNT(DISTINCT dp.id_user) as count 
      FROM dinas d
      JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
      WHERE DATE(d.tanggal_mulai) <= ? 
      AND (DATE(d.tanggal_selesai) >= ? OR d.tanggal_selesai IS NULL)
      AND d.status = 'aktif'
    `, [today, today]);
    
    // Count employees who haven't checked in today (among those on dinas)
    const [belumAbsenRows] = await db.execute(`
      SELECT COUNT(DISTINCT dp.id_user) as count 
      FROM dinas d
      JOIN dinas_pegawai dp ON d.id_dinas = dp.id_dinas
      LEFT JOIN presensi pr ON dp.id_dinas = pr.dinas_id AND dp.id_user = pr.id_user AND DATE(pr.tanggal) = ? AND pr.jenis_presensi = 'dinas'
      WHERE DATE(d.tanggal_mulai) <= ? 
      AND (DATE(d.tanggal_selesai) >= ? OR d.tanggal_selesai IS NULL)
      AND d.status = 'aktif'
      AND pr.id_user IS NULL
    `, [today, today, today]);
    
    const stats = {
      dinasAktif: dinasAktifRows[0].count || 0,
      selesaiDinas: selesaiDinasRows[0].count || 0,
      pegawaiDinas: pegawaiDinasRows[0].count || 0,
      belumAbsen: belumAbsenRows[0].count || 0
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching dinas stats:', error);
    res.json({
      success: false,
      message: 'Database error: ' + error.message,
      data: {
        dinasAktif: 0,
        selesaiDinas: 0,
        pegawaiDinas: 0,
        belumAbsen: 0
      }
    });
  }
};

const getDinasLokasi = async (req, res) => {
  try {
    const { id_dinas } = req.params;
    const db = await getConnection();

    const [rows] = await db.execute(`
      SELECT lk.*, dl.urutan, dl.is_lokasi_utama
      FROM dinas_lokasi dl
      JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
      WHERE dl.id_dinas = ? AND lk.is_active = 1
      ORDER BY dl.urutan
    `, [id_dinas]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get dinas lokasi error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const checkAbsenLocation = async (req, res) => {
  try {
    const { id_dinas, latitude, longitude } = req.body;
    
    if (!id_dinas || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'id_dinas, latitude, dan longitude wajib diisi'
      });
    }

    const db = await getConnection();

    // Get all locations for this dinas
    const [lokasi] = await db.execute(`
      SELECT lk.*, dl.is_lokasi_utama
      FROM dinas_lokasi dl
      JOIN lokasi_kantor lk ON dl.id_lokasi_kantor = lk.id
      WHERE dl.id_dinas = ? AND lk.is_active = 1
    `, [id_dinas]);

    if (lokasi.length === 0) {
      return res.json({
        success: false,
        message: 'Tidak ada lokasi dinas yang terdaftar'
      });
    }

    // Check if user is within radius of any location
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    for (const loc of lokasi) {
      const distance = calculateDistance(
        userLat,
        userLng,
        parseFloat(loc.latitude),
        parseFloat(loc.longitude)
      );

      if (distance <= loc.radius) {
        return res.json({
          success: true,
          inRadius: true,
          lokasi: {
            id: loc.id,
            nama: loc.nama_lokasi,
            alamat: loc.alamat,
            distance: Math.round(distance)
          }
        });
      }
    }

    // Not in any location radius
    res.json({
      success: true,
      inRadius: false,
      message: 'Anda berada di luar radius semua lokasi dinas'
    });

  } catch (error) {
    console.error('Check location error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

const deleteDinas = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID dinas wajib diisi'
      });
    }

    const db = await getConnection();
    connection = await db.getConnection();

    const [dinasRows] = await connection.execute(
      'SELECT * FROM dinas WHERE id_dinas = ?',
      [id]
    );

    if (dinasRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data dinas tidak ditemukan'
      });
    }

    await connection.beginTransaction();

    try {
      await connection.execute('DELETE FROM dinas_pegawai WHERE id_dinas = ?', [id]);
      await connection.execute('DELETE FROM dinas_lokasi WHERE id_dinas = ?', [id]);
      await connection.execute('DELETE FROM presensi WHERE dinas_id = ? AND jenis_presensi = "dinas"', [id]);
      await connection.execute('DELETE FROM dinas WHERE id_dinas = ?', [id]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Data dinas berhasil dihapus'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Delete dinas error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal menghapus data dinas'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const updateDinas = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { nama_kegiatan, nomor_spt, tanggal_mulai, tanggal_selesai, jenis_dinas, deskripsi, jam_mulai, jam_selesai } = req.body;
    
    let pegawai_ids, lokasi_ids;
    try {
      pegawai_ids = JSON.parse(req.body.pegawai_ids);
      lokasi_ids = JSON.parse(req.body.lokasi_ids);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid array format'
      });
    }

    // Tentukan tipe_jam_kerja berdasarkan jam_mulai & jam_selesai
    const tipe_jam_kerja = (jam_mulai && jam_selesai) ? 'custom' : 'default';
    const dokumen_spt = req.file ? req.file.filename : null;

    const db = await getConnection();
    connection = await db.getConnection();

    await connection.beginTransaction();

    try {
      if (dokumen_spt) {
        await connection.execute(`
          UPDATE dinas SET
            nama_kegiatan = ?, nomor_spt = ?, jenis_dinas = ?,
            tanggal_mulai = ?, tanggal_selesai = ?,
            tipe_jam_kerja = ?, jam_mulai = ?, jam_selesai = ?, deskripsi = ?, dokumen_spt = ?
          WHERE id_dinas = ?
        `, [
          nama_kegiatan.trim(),
          nomor_spt.trim(),
          jenis_dinas || 'lokal',
          tanggal_mulai,
          tanggal_selesai,
          tipe_jam_kerja,
          jam_mulai || null,
          jam_selesai || null,
          deskripsi || '',
          dokumen_spt,
          id
        ]);
      } else {
        await connection.execute(`
          UPDATE dinas SET
            nama_kegiatan = ?, nomor_spt = ?, jenis_dinas = ?,
            tanggal_mulai = ?, tanggal_selesai = ?,
            tipe_jam_kerja = ?, jam_mulai = ?, jam_selesai = ?, deskripsi = ?
          WHERE id_dinas = ?
        `, [
          nama_kegiatan.trim(),
          nomor_spt.trim(),
          jenis_dinas || 'lokal',
          tanggal_mulai,
          tanggal_selesai,
          tipe_jam_kerja,
          jam_mulai || null,
          jam_selesai || null,
          deskripsi || '',
          id
        ]);
      }

      await connection.execute('DELETE FROM dinas_pegawai WHERE id_dinas = ?', [id]);
      await connection.execute('DELETE FROM dinas_lokasi WHERE id_dinas = ?', [id]);

      const lokasiPlaceholders = lokasi_ids.map(() => '?').join(',');
      const [validLokasi] = await connection.execute(`SELECT id FROM lokasi_kantor WHERE id IN (${lokasiPlaceholders})`, lokasi_ids);

      for (let i = 0; i < validLokasi.length; i++) {
        await connection.execute(`
          INSERT INTO dinas_lokasi (id_dinas, id_lokasi_kantor, id_lokasi, urutan, is_lokasi_utama)
          VALUES (?, ?, ?, ?, ?)
        `, [id, validLokasi[i].id, validLokasi[i].id, i + 1, i === 0 ? 1 : 0]);
      }

      const placeholders = pegawai_ids.map(() => '?').join(',');
      const [validUsers] = await connection.execute(`SELECT id_user FROM users WHERE id_user IN (${placeholders})`, pegawai_ids);

      for (const user of validUsers) {
        await connection.execute(`
          INSERT INTO dinas_pegawai (id_dinas, id_user, status_konfirmasi, tanggal_konfirmasi)
          VALUES (?, ?, 'konfirmasi', NOW())
        `, [id, user.id_user]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Data dinas berhasil diupdate'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Update dinas error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// NEW: Validate absen dinas with separate masuk/pulang
const validateAbsenDinas = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, catatan, absen_type } = req.body;
    
    if (!id || !action || !absen_type) {
      return res.status(400).json({
        success: false,
        message: 'ID absen, action, dan absen_type wajib diisi'
      });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action harus approve atau reject'
      });
    }
    
    if (!['masuk', 'pulang'].includes(absen_type)) {
      return res.status(400).json({
        success: false,
        message: 'absen_type harus masuk atau pulang'
      });
    }
    
    const db = await getConnection();
    
    // Get admin user ID (simplified - in production, get from auth token)
    const [adminRows] = await db.execute('SELECT id_user FROM users WHERE role = "admin" LIMIT 1');
    const adminId = adminRows[0]?.id_user;
    
    const status = action === 'approve' ? 'disetujui' : 'ditolak';
    
    // Update berdasarkan absen_type
    if (absen_type === 'masuk') {
      await db.execute(`
        UPDATE presensi 
        SET status_validasi_masuk = ?, 
            status_validasi = ?,
            divalidasi_masuk_oleh = ?,
            catatan_validasi_masuk = ?,
            waktu_validasi_masuk = NOW()
        WHERE id_presensi = ? AND jenis_presensi = 'dinas'
      `, [status, status, adminId, catatan || null, id]);
    } else {
      await db.execute(`
        UPDATE presensi 
        SET status_validasi_pulang = ?, 
            status_validasi = ?,
            divalidasi_pulang_oleh = ?,
            catatan_validasi_pulang = ?,
            waktu_validasi_pulang = NOW()
        WHERE id_presensi = ? AND jenis_presensi = 'dinas'
      `, [status, status, adminId, catatan || null, id]);
    }
    
    res.json({
      success: true,
      message: `Absen ${absen_type} berhasil ${status}`
    });
    
  } catch (error) {
    console.error('Validate absen error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { 
  uploadSPT,
  getDinasAktifAdmin, 
  createDinasAdmin,
  updateDinas,
  deleteDinas, 
  getRiwayatDinasAdmin, 
  getValidasiAbsenAdmin,
  getDinasStats,
  getDinasLokasi,
  checkAbsenLocation,
  validateAbsenDinas
};
