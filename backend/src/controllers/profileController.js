const { getConnection } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/pegawai';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pegawai-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const getProfile = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();

    // First check if user exists
    const [userRows] = await db.execute('SELECT id_user, email, role FROM users WHERE id_user = ?', [user_id]);
    const userExists = userRows[0];

    if (!userExists) {
      return res.json({ success: false, message: 'User tidak ditemukan' });
    }

    if (userExists.role !== 'pegawai') {
      return res.json({ success: false, message: 'User bukan pegawai' });
    }

    // Get full profile data
    const [profileRows] = await db.execute(`
      SELECT u.id_user, u.email, u.role, p.nama_lengkap, p.nip, p.jabatan, 
             p.divisi, p.no_telepon, p.alamat, p.jenis_kelamin, p.tanggal_lahir, p.foto_profil 
      FROM users u 
      LEFT JOIN pegawai p ON u.id_user = p.id_user 
      WHERE u.id_user = ?
    `, [user_id]);

    const user = profileRows[0];

    if (user) {
      // If no pegawai data, create default structure
      if (!user.nama_lengkap) {
        user.nama_lengkap = user.email;
        user.jabatan = 'Pegawai';
      }

      // Format tanggal_lahir
      if (user.tanggal_lahir) {
        user.tanggal_lahir = new Date(user.tanggal_lahir).toISOString().split('T')[0];
      }

      res.json({
        success: true,
        data: user,
        debug: {
          user_id: user_id,
          has_pegawai_data: !!user.nama_lengkap
        }
      });
    } else {
      res.json({ success: false, message: 'Data tidak ditemukan' });
    }

  } catch (error) {
    console.error('Get profile error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { nama_lengkap, jenis_kelamin, tanggal_lahir, alamat, no_telepon } = req.body;

    if (!userId) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    const db = await getConnection();

    const [checkRows] = await db.execute('SELECT id_pegawai, foto_profil FROM pegawai WHERE id_user = ?', [userId]);
    const exists = checkRows[0];

    let fotoPath = exists?.foto_profil || null;

    if (req.file) {
      if (exists?.foto_profil) {
        const oldPath = path.join(__dirname, '../../', exists.foto_profil);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      // Simpan hanya path relatif dari uploads/
      fotoPath = req.file.path.replace(/\\/g, '/').replace(/^.*uploads/, 'uploads');
    }

    let result;
    if (exists) {
      [result] = await db.execute(
        'UPDATE pegawai SET nama_lengkap = ?, jenis_kelamin = ?, tanggal_lahir = ?, alamat = ?, no_telepon = ?, foto_profil = ? WHERE id_user = ?',
        [nama_lengkap, jenis_kelamin, tanggal_lahir, alamat, no_telepon, fotoPath, userId]
      );
    } else {
      [result] = await db.execute(
        'INSERT INTO pegawai (id_user, nama_lengkap, jenis_kelamin, tanggal_lahir, alamat, no_telepon, foto_profil) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, nama_lengkap, jenis_kelamin, tanggal_lahir, alamat, no_telepon, fotoPath]
      );
    }

    if (result.affectedRows > 0) {
      res.json({ 
        success: true, 
        message: 'Profil berhasil diperbarui',
        data: { foto_profil: fotoPath }
      });
    } else {
      res.json({ success: false, message: 'Gagal memperbarui profil' });
    }

  } catch (error) {
    console.error('Update profile error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { password_lama, password_baru } = req.body;

    if (!userId) {
      return res.json({ success: false, message: 'User ID diperlukan' });
    }

    if (!password_lama || !password_baru) {
      return res.json({ success: false, message: 'Password lama dan baru harus diisi' });
    }

    if (password_baru.length < 6) {
      return res.json({ success: false, message: 'Password minimal 6 karakter' });
    }

    const db = await getConnection();

    const [userRows] = await db.execute('SELECT password FROM users WHERE id_user = ?', [userId]);
    
    if (userRows.length === 0) {
      return res.json({ success: false, message: 'User tidak ditemukan' });
    }

    const isMatch = await bcrypt.compare(password_lama, userRows[0].password);
    
    if (!isMatch) {
      return res.json({ success: false, message: 'Password lama tidak sesuai' });
    }

    const hashedPassword = await bcrypt.hash(password_baru, 10);
    
    const [result] = await db.execute(
      'UPDATE users SET password = ? WHERE id_user = ?',
      [hashedPassword, userId]
    );

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Password berhasil diubah' });
    } else {
      res.json({ success: false, message: 'Gagal mengubah password' });
    }

  } catch (error) {
    console.error('Change password error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

module.exports = { getProfile, updateProfile, upload, changePassword };
