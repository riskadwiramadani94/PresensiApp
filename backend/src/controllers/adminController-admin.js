const bcrypt = require('bcryptjs');
const { getConnection } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/admin');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

const getAdminProfile = async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.json({ success: false, message: 'User ID tidak ditemukan' });
    }

    const db = await getConnection();
    const [rows] = await db.execute(
      'SELECT id_user, email, nama_lengkap, foto_profil, no_telepon, role, created_at FROM users WHERE id_user = ? AND role = "admin"',
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Admin tidak ditemukan' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const updateAdminProfileData = async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { nama_lengkap, email, no_telepon } = req.body;
    const foto_profil = req.file;

    if (!userId) {
      return res.json({ success: false, message: 'User ID tidak ditemukan' });
    }

    const db = await getConnection();

    // Check if admin exists
    const [adminRows] = await db.execute(
      'SELECT id_user, foto_profil FROM users WHERE id_user = ? AND role = "admin"',
      [userId]
    );

    if (adminRows.length === 0) {
      return res.json({ success: false, message: 'Admin tidak ditemukan' });
    }

    // Build update query
    let updateFields = [];
    let updateValues = [];

    if (nama_lengkap) {
      updateFields.push('nama_lengkap = ?');
      updateValues.push(nama_lengkap);
    }

    if (email) {
      // Check if email already exists for other users
      const [emailCheck] = await db.execute(
        'SELECT id_user FROM users WHERE email = ? AND id_user != ?',
        [email, userId]
      );
      if (emailCheck.length > 0) {
        return res.json({ success: false, message: 'Email sudah digunakan' });
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (no_telepon !== undefined) {
      updateFields.push('no_telepon = ?');
      updateValues.push(no_telepon);
    }

    if (foto_profil) {
      const fotoPath = 'uploads/admin/' + foto_profil.filename;
      updateFields.push('foto_profil = ?');
      updateValues.push(fotoPath);

      // Delete old photo if exists
      const oldPhoto = adminRows[0].foto_profil;
      if (oldPhoto) {
        const oldPhotoPath = path.join(__dirname, '../../', oldPhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.json({ success: false, message: 'Tidak ada data yang diupdate' });
    }

    updateValues.push(userId);
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id_user = ?`;
    
    await db.execute(updateQuery, updateValues);

    // Get updated data
    const [updatedRows] = await db.execute(
      'SELECT id_user, email, nama_lengkap, foto_profil, no_telepon, role, created_at FROM users WHERE id_user = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const getAdminData = async (req, res) => {
  try {
    const { action, user_id } = req.body;
    
    // Handle update action
    if (action === 'update') {
      return await updateAdminProfile(req, res);
    }

    const db = await getConnection();

    // Get total pegawai count
    const [totalRows] = await db.execute(`
      SELECT COUNT(*) as total_pegawai
      FROM users u
      WHERE u.role = 'pegawai'
    `);
    const totalPegawai = totalRows[0].total_pegawai;

    // Get attendance stats - menghindari duplikasi user
    const [statsRows] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN (pr.jam_masuk IS NOT NULL OR ad.jam_masuk IS NOT NULL) THEN 1 END) as hadir,
        COUNT(CASE WHEN (pr.jam_masuk IS NULL AND ad.jam_masuk IS NULL) THEN 1 END) as tidak_hadir
      FROM users u
      LEFT JOIN pegawai p ON u.id_user = p.id_user
      LEFT JOIN presensi pr ON u.id_user = pr.id_user AND DATE(pr.tanggal) = CURDATE()
      LEFT JOIN absen_dinas ad ON u.id_user = ad.id_user AND ad.tanggal_absen = CURDATE()
      WHERE u.role = 'pegawai'
    `);
    const hadir = parseInt(statsRows[0].hadir || 0);
    const tidak_hadir = parseInt(statsRows[0].tidak_hadir || 0);

    console.log('Dashboard Stats:', { totalPegawai, hadir, tidak_hadir });

    // Get recent activities - GABUNGAN presensi + absen_dinas
    const [recentRows] = await db.execute(`
      SELECT 
        p.nama_lengkap,
        'Hadir' as status,
        TIME_FORMAT(pr.jam_masuk, '%H:%i:%s') as jam_masuk,
        p.foto_profil,
        'kantor' as jenis
      FROM presensi pr
      LEFT JOIN users u ON pr.id_user = u.id_user
      LEFT JOIN pegawai p ON u.id_user = p.id_user
      WHERE u.role = 'pegawai' 
      AND DATE(pr.tanggal) = CURDATE()
      AND pr.jam_masuk IS NOT NULL
      
      UNION ALL
      
      SELECT 
        p.nama_lengkap,
        'Dinas' as status,
        TIME_FORMAT(ad.jam_masuk, '%H:%i:%s') as jam_masuk,
        p.foto_profil,
        'dinas' as jenis
      FROM absen_dinas ad
      LEFT JOIN users u ON ad.id_user = u.id_user
      LEFT JOIN pegawai p ON u.id_user = p.id_user
      WHERE u.role = 'pegawai' 
      AND ad.tanggal_absen = CURDATE()
      AND ad.jam_masuk IS NOT NULL
      
      ORDER BY jam_masuk DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      user: {
        id_user: 1,
        nama_lengkap: 'Administrator',
        email: 'admin@itb.ac.id',
        role: 'admin'
      },
      stats: {
        hadir: hadir,
        tidak_hadir: tidak_hadir,
        total_pegawai: parseInt(totalPegawai)
      },
      recent: recentRows || []
    });

  } catch (error) {
    console.error('Admin data error:', error);
    res.json({ success: false, message: 'Database error: ' + error.message });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { user_id, email, password_lama, password_baru } = req.body;
    
    console.log('=== UPDATE PROFILE DEBUG ===');
    console.log('Request data:', { user_id, email, has_old_pass: !!password_lama, has_new_pass: !!password_baru });
    
    // Validate user_id
    const userId = parseInt(user_id);
    if (!user_id || isNaN(userId) || userId <= 0) {
      return res.json({ success: false, message: 'ID pengguna tidak valid' });
    }
    
    const db = await getConnection();

    // Update email if provided
    if (email && email.trim()) {
      await db.execute('UPDATE users SET email = ? WHERE id_user = ?', [email.trim(), userId]);
      console.log('Email updated successfully');
    }

    // Update password if both old and new passwords are provided
    if (password_lama && password_lama.trim() && password_baru && password_baru.trim()) {
      console.log('Processing password update...');
      
      // Get current password hash
      const [userRows] = await db.execute('SELECT password FROM users WHERE id_user = ?', [userId]);
      const user = userRows[0];
      
      if (!user) {
        console.log('User not found');
        return res.json({ success: false, message: 'User tidak ditemukan' });
      }
      
      console.log('Current password hash:', user.password.substring(0, 20) + '...');
      
      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(password_lama.trim(), user.password);
      console.log('Old password valid:', isOldPasswordValid);
      
      if (!isOldPasswordValid) {
        return res.json({ success: false, message: 'Password lama salah' });
      }

      if (password_baru.trim().length < 6) {
        return res.json({ success: false, message: 'Password minimal 6 karakter' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password_baru.trim(), 10);
      console.log('New password hash:', hashedPassword.substring(0, 20) + '...');
      
      // Update password
      const [updateResult] = await db.execute('UPDATE users SET password = ? WHERE id_user = ?', [hashedPassword, userId]);
      console.log('Password update result:', updateResult);
      
      // Verify update
      const [verifyRows] = await db.execute('SELECT password FROM users WHERE id_user = ?', [userId]);
      console.log('Password updated in DB:', verifyRows[0].password.substring(0, 20) + '...');
    }

    console.log('=== UPDATE COMPLETE ===');
    res.json({ success: true, message: 'Profil berhasil diupdate' });

  } catch (error) {
    console.error('Update admin profile error:', error);
    res.json({ success: false, message: 'Kesalahan database: ' + error.message });
  }
};


module.exports = { getAdminData, updateAdminProfile, getAdminProfile, updateAdminProfileData, upload };
