const { getConnection } = require('../config/database');
const bcrypt = require('bcryptjs');

const getPegawaiData = async (req, res) => {
  try {
    const db = await getConnection();
    
    const [rows] = await db.execute(`
      SELECT 
        p.id_pegawai,
        p.id_user,
        p.nama_lengkap,
        p.nip,
        p.jenis_kelamin,
        p.jabatan,
        p.divisi,
        p.no_telepon,
        p.status_pegawai,
        p.foto_profil,
        u.email,
        u.password,
        u.role
      FROM pegawai p 
      LEFT JOIN users u ON p.id_user = u.id_user
      ORDER BY p.nama_lengkap ASC
    `);

    // Mask password untuk keamanan
    const result = rows.map(row => ({
      ...row,
      has_password: !!row.password,
      password: row.password ? '••••••••' : null
    }));

    res.json({
      success: true,
      data: result,
      total: result.length
    });

  } catch (error) {
    console.error('Get pegawai data error:', error);
    res.json({ success: false, error: 'Database error: ' + error.message });
  }
};

// Kelola Pegawai - GET all employees
const getKelolaPegawai = async (req, res) => {
  try {
    const db = await getConnection();
    
    const [rows] = await db.execute(`
      SELECT u.id_user, u.email, u.role, p.nama_lengkap, p.nip, p.jabatan, p.divisi, p.status_pegawai 
      FROM users u 
      LEFT JOIN pegawai p ON u.id_user = p.id_user 
      ORDER BY u.id_user DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get kelola pegawai error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
};

// Kelola Pegawai - POST add new employee
const createKelolaPegawai = async (req, res) => {
  let connection;
  try {
    const { email, password, role, nama_lengkap, nip, jenis_kelamin, jabatan, divisi, no_telepon, alamat, tanggal_lahir } = req.body;
    
    const db = await getConnection();
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert user
      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hashedPassword, role]
      );
      const userId = userResult.insertId;
      
      // Insert pegawai
      await connection.execute(`
        INSERT INTO pegawai (id_user, nama_lengkap, nip, jenis_kelamin, jabatan, divisi, no_telepon, alamat, tanggal_lahir) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, nama_lengkap, nip, jenis_kelamin, jabatan, divisi, no_telepon, alamat, tanggal_lahir]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Pegawai berhasil ditambahkan'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Create kelola pegawai error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Kelola Pegawai - DELETE employee
const deleteKelolaPegawai = async (req, res) => {
  let connection;
  try {
    const { id_user } = req.body;
    
    const db = await getConnection();
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete pegawai first
      await connection.execute('DELETE FROM pegawai WHERE id_user = ?', [id_user]);
      
      // Delete user
      await connection.execute('DELETE FROM users WHERE id_user = ?', [id_user]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Pegawai berhasil dihapus'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Delete kelola pegawai error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getDetailPegawai = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.json({
        success: false,
        message: 'ID pegawai tidak ditemukan'
      });
    }

    const db = await getConnection();
    
    // Query dengan JOIN untuk mendapatkan data lengkap
    let [rows] = await db.execute(`
      SELECT 
        p.id_pegawai,
        p.id_user,
        p.nama_lengkap,
        p.nip,
        p.jenis_kelamin,
        DATE_FORMAT(p.tanggal_lahir, '%Y-%m-%d') as tanggal_lahir,
        p.alamat,
        p.no_telepon,
        p.jabatan,
        p.divisi,
        DATE_FORMAT(p.tanggal_masuk, '%Y-%m-%d') as tanggal_masuk,
        CASE 
          WHEN p.foto_profil IS NOT NULL AND p.foto_profil != '' 
          THEN p.foto_profil
          ELSE NULL
        END as foto_profil,
        p.status_pegawai,
        u.email,
        u.password,
        u.role
      FROM pegawai p 
      LEFT JOIN users u ON p.id_user = u.id_user
      WHERE p.id_pegawai = ?
    `, [id]);
    
    // Jika tidak ditemukan dengan id_pegawai, coba dengan id_user
    if (rows.length === 0) {
      [rows] = await db.execute(`
        SELECT 
          p.id_pegawai,
          p.id_user,
          p.nama_lengkap,
          p.nip,
          p.jenis_kelamin,
          DATE_FORMAT(p.tanggal_lahir, '%Y-%m-%d') as tanggal_lahir,
          p.alamat,
          p.no_telepon,
          p.jabatan,
          p.divisi,
          DATE_FORMAT(p.tanggal_masuk, '%Y-%m-%d') as tanggal_masuk,
          CASE 
            WHEN p.foto_profil IS NOT NULL AND p.foto_profil != '' 
            THEN p.foto_profil
            ELSE NULL
          END as foto_profil,
          p.status_pegawai,
          u.email,
          u.password,
          u.role
        FROM pegawai p 
        LEFT JOIN users u ON p.id_user = u.id_user
        WHERE u.id_user = ?
      `, [id]);
    }
    
    if (rows.length > 0) {
      const result = rows[0];
      // Add has_password field and mask password
      if (result.password) {
        result.has_password = true;
        result.password = '••••••••'; // Mask password
      } else {
        result.has_password = false;
        result.password = null;
      }
      
      res.json({
        success: true,
        data: result
      });
    } else {
      res.json({
        success: false,
        message: 'Data pegawai tidak ditemukan'
      });
    }
    
  } catch (error) {
    console.error('Get detail pegawai error:', error);
    res.json({ success: false, error: error.message });
  }
};

const createPegawai = async (req, res) => {
  let connection;
  try {
    const { nama_lengkap, nip, email, password, jenis_kelamin, jabatan, divisi, no_telepon, alamat, tanggal_lahir } = req.body;

    // Validasi field wajib
    const required_fields = ['nama_lengkap', 'nip', 'email', 'password'];
    for (const field of required_fields) {
      if (!req.body[field]) {
        return res.json({ success: false, message: `Field ${field} wajib diisi` });
      }
    }

    // Convert tanggal_lahir dari DD/MM/YYYY ke YYYY-MM-DD
    let tanggal_lahir_formatted = null;
    if (tanggal_lahir) {
      const parts = tanggal_lahir.split('/');
      if (parts.length === 3) {
        tanggal_lahir_formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const db = await getConnection();
    connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert ke tabel users dulu
      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password, role) VALUES (?, ?, "pegawai")',
        [email, hashedPassword]
      );
      const userId = userResult.insertId;

      // Insert ke tabel pegawai
      const [pegawaiResult] = await connection.execute(`
        INSERT INTO pegawai (
          id_user, nama_lengkap, nip, jenis_kelamin, jabatan, divisi, 
          no_telepon, alamat, tanggal_lahir, status_pegawai, tanggal_masuk
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', NOW())
      `, [
        userId, nama_lengkap, nip, jenis_kelamin || null, jabatan || null, 
        divisi || null, no_telepon || null, alamat || null, tanggal_lahir_formatted
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Data pegawai berhasil ditambahkan',
        id_pegawai: pegawaiResult.insertId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Create pegawai error:', error);
    res.json({ success: false, message: 'Gagal menambahkan data: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const deletePegawai = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const db = await getConnection();

    // Get user_id first
    const [pegawaiRows] = await db.execute('SELECT id_user FROM pegawai WHERE id_pegawai = ?', [id]);
    if (pegawaiRows.length === 0) {
      return res.json({ success: false, message: 'Pegawai tidak ditemukan' });
    }

    const userId = pegawaiRows[0].id_user;
    connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Delete from pegawai table first
      await connection.execute('DELETE FROM pegawai WHERE id_pegawai = ?', [id]);
      
      // Delete from users table
      await connection.execute('DELETE FROM users WHERE id_user = ?', [userId]);

      await connection.commit();

      res.json({ success: true, message: 'Data pegawai berhasil dihapus' });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Delete pegawai error:', error);
    res.json({ success: false, message: 'Gagal menghapus data: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const updatePegawai = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { nama_lengkap, nip, email, jenis_kelamin, jabatan, divisi, no_telepon, alamat, tanggal_lahir, status_pegawai } = req.body;

    const db = await getConnection();

    // Get user_id first
    const [pegawaiRows] = await db.execute('SELECT id_user FROM pegawai WHERE id_pegawai = ?', [id]);
    if (pegawaiRows.length === 0) {
      return res.json({ success: false, message: 'Pegawai tidak ditemukan' });
    }

    const userId = pegawaiRows[0].id_user;
    connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update users table
      if (email) {
        await connection.execute('UPDATE users SET email = ? WHERE id_user = ?', [email, userId]);
      }

      // Update pegawai table
      await connection.execute(`
        UPDATE pegawai SET 
          nama_lengkap = ?, nip = ?, jenis_kelamin = ?, jabatan = ?, 
          divisi = ?, no_telepon = ?, alamat = ?, tanggal_lahir = ?, status_pegawai = ?
        WHERE id_pegawai = ?
      `, [nama_lengkap, nip, jenis_kelamin, jabatan, divisi, no_telepon, alamat, tanggal_lahir, status_pegawai || null, id]);

      await connection.commit();

      res.json({ success: true, message: 'Data pegawai berhasil diupdate' });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Update pegawai error:', error);
    res.json({ success: false, message: 'Gagal mengupdate data: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = { 
  getPegawaiData, 
  getDetailPegawai, 
  createPegawai, 
  deletePegawai, 
  updatePegawai,
  getKelolaPegawai,
  createKelolaPegawai,
  deleteKelolaPegawai
};
