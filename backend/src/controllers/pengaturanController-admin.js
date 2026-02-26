const { getConnection } = require('../config/database');

const getLokasiKantor = async (req, res) => {
  try {
    const db = await getConnection();
    
    const [locations] = await db.execute(`
      SELECT 
        id,
        nama_lokasi,
        alamat,
        lintang,
        bujur,
        radius,
        jenis_lokasi,
        is_active
      FROM lokasi_kantor 
      WHERE is_active = 1
      ORDER BY jenis_lokasi ASC, nama_lokasi ASC
    `);

    const formatted_locations = locations.map(location => ({
      id: parseInt(location.id),
      nama_lokasi: location.nama_lokasi,
      alamat: location.alamat,
      lintang: parseFloat(location.lintang),
      bujur: parseFloat(location.bujur),
      radius: parseInt(location.radius),
      jenis_lokasi: location.jenis_lokasi,
      is_active: Boolean(location.is_active)
    }));

    res.json({
      success: true,
      message: 'Data lokasi berhasil diambil',
      data: formatted_locations,
      total: formatted_locations.length
    });

  } catch (error) {
    console.error('Get lokasi kantor error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const createLokasiKantor = async (req, res) => {
  try {
    const { nama_lokasi, alamat, lintang, bujur, radius, jenis_lokasi } = req.body;

    // Validate required fields
    const required_fields = ['nama_lokasi', 'alamat', 'lintang', 'bujur'];
    for (const field of required_fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        return res.status(400).json({
          success: false,
          message: `Field '${field}' is required`
        });
      }
    }

    const db = await getConnection();

    const [result] = await db.execute(`
      INSERT INTO lokasi_kantor (
        nama_lokasi, alamat, lintang, bujur, radius, 
        jenis_lokasi, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [
      nama_lokasi.trim(),
      alamat.trim(),
      lintang,
      bujur,
      radius || 100,
      jenis_lokasi || 'dinas'
    ]);

    res.json({
      success: true,
      message: 'Lokasi berhasil ditambahkan',
      data: {
        id: result.insertId,
        nama_lokasi: nama_lokasi,
        jenis_lokasi: jenis_lokasi || 'dinas'
      }
    });

  } catch (error) {
    console.error('Create lokasi kantor error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const updateLokasiKantor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_lokasi, alamat, lintang, bujur, radius } = req.body;

    // Validate required fields
    const required_fields = ['nama_lokasi', 'alamat', 'lintang', 'bujur', 'radius'];
    for (const field of required_fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        return res.status(400).json({
          success: false,
          message: `Field '${field}' is required`
        });
      }
    }

    const db = await getConnection();

    // Check if location exists
    const [checkRows] = await db.execute('SELECT id FROM lokasi_kantor WHERE id = ?', [id]);
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lokasi tidak ditemukan'
      });
    }

    // Update location
    const [result] = await db.execute(`
      UPDATE lokasi_kantor 
      SET nama_lokasi = ?, alamat = ?, lintang = ?, bujur = ?, radius = ?
      WHERE id = ?
    `, [
      nama_lokasi.trim(),
      alamat.trim(),
      lintang,
      bujur,
      radius,
      id
    ]);

    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Lokasi berhasil diupdate'
      });
    } else {
      throw new Error('Gagal mengupdate lokasi');
    }

  } catch (error) {
    console.error('Update lokasi kantor error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteLokasiKantor = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getConnection();

    // Cek penggunaan di dinas_lokasi
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM dinas_lokasi WHERE id_lokasi = ?', [id]);
    const count = countRows[0].count;

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Lokasi tidak dapat dihapus karena sedang digunakan dalam kegiatan dinas'
      });
    }

    // Soft delete
    const [result] = await db.execute('UPDATE lokasi_kantor SET is_active = 0 WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lokasi tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Lokasi berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete lokasi kantor error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Jam Kerja functions
const getJamKerja = async (req, res) => {
  try {
    const db = await getConnection();
    
    const [data] = await db.execute(`
      SELECT hari, jam_masuk, batas_absen, jam_pulang, is_kerja 
      FROM jam_kerja_hari 
      ORDER BY FIELD(hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')
    `);

    // Convert is_kerja to boolean
    const formatted_data = data.map(row => ({
      ...row,
      is_kerja: Boolean(row.is_kerja)
    }));

    res.json({
      success: true,
      data: formatted_data
    });

  } catch (error) {
    console.error('Get jam kerja error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const saveJamKerja = async (req, res) => {
  let connection;
  try {
    const { jam_kerja } = req.body;

    if (!jam_kerja || !Array.isArray(jam_kerja)) {
      return res.status(400).json({
        success: false,
        message: 'Data jam kerja tidak valid'
      });
    }

    const db = await getConnection();
    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const today = new Date().toISOString().split('T')[0];

      for (const item of jam_kerja) {
        const { hari, jam_masuk, batas_absen, jam_pulang, is_kerja } = item;

        if (!hari || !jam_masuk || !batas_absen || !jam_pulang) {
          throw new Error(`Data tidak lengkap untuk hari ${hari}`);
        }

        // 1. Tutup history lama
        await connection.execute(`
          UPDATE jam_kerja_history 
          SET tanggal_selesai_berlaku = DATE_SUB(?, INTERVAL 1 DAY)
          WHERE hari = ? AND tanggal_selesai_berlaku IS NULL
        `, [today, hari]);

        // 2. Insert history baru
        await connection.execute(`
          INSERT INTO jam_kerja_history 
          (hari, jam_masuk, batas_absen, jam_pulang, is_kerja, tanggal_mulai_berlaku)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [hari, jam_masuk, batas_absen, jam_pulang, is_kerja ? 1 : 0, today]);

        // 3. Update jam_kerja_hari (untuk UI)
        await connection.execute(`
          INSERT INTO jam_kerja_hari (hari, jam_masuk, batas_absen, jam_pulang, is_kerja) 
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          jam_masuk = VALUES(jam_masuk),
          batas_absen = VALUES(batas_absen),
          jam_pulang = VALUES(jam_pulang),
          is_kerja = VALUES(is_kerja)
        `, [hari, jam_masuk, batas_absen, jam_pulang, is_kerja ? 1 : 0]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Pengaturan jam kerja berhasil disimpan dan history tersimpan'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Save jam kerja error:', error);
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

// Hari Libur functions
const getHariLibur = async (req, res) => {
  try {
    const db = await getConnection();
    
    const [data] = await db.execute(`
      SELECT * FROM hari_libur 
      WHERE is_active = 1 
      ORDER BY tanggal ASC
    `);

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Get hari libur error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const createHariLibur = async (req, res) => {
  try {
    const { tanggal, nama_libur, jenis } = req.body;

    if (!tanggal || !nama_libur) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal dan nama libur wajib diisi'
      });
    }

    const db = await getConnection();

    // Check if holiday already exists
    const [checkRows] = await db.execute(
      'SELECT id FROM hari_libur WHERE tanggal = ? AND is_active = 1',
      [tanggal]
    );

    if (checkRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hari libur pada tanggal ini sudah ada'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO hari_libur (tanggal, nama_libur, jenis, is_active) 
      VALUES (?, ?, ?, 1)
    `, [tanggal, nama_libur, jenis || 'nasional']);

    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Hari libur berhasil ditambahkan'
      });
    } else {
      throw new Error('Gagal menambahkan hari libur');
    }

  } catch (error) {
    console.error('Create hari libur error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteHariLibur = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID tidak valid'
      });
    }

    const db = await getConnection();

    const [result] = await db.execute(
      'UPDATE hari_libur SET is_active = 0 WHERE id = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Hari libur berhasil dihapus'
      });
    } else {
      throw new Error('Gagal menghapus hari libur');
    }

  } catch (error) {
    console.error('Delete hari libur error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { 
  getLokasiKantor, 
  createLokasiKantor, 
  updateLokasiKantor, 
  deleteLokasiKantor,
  getJamKerja,
  saveJamKerja,
  getHariLibur,
  createHariLibur,
  deleteHariLibur
};
