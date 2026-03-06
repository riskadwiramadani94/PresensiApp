const { getConnection } = require('../config/database');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Setup email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Generate 6 digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Kirim OTP ke email
const kirimOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const db = await getConnection();

        // Cek apakah email ada di database
        const [users] = await db.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Email tidak terdaftar' 
            });
        }

        // Generate OTP
        const kodeOTP = generateOTP();
        const waktuExpired = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

        // Hapus OTP lama untuk email ini
        await db.execute('DELETE FROM lupa_password WHERE email = ?', [email]);

        // Simpan OTP baru
        await db.execute(
            'INSERT INTO lupa_password (email, kode_otp, waktu_expired) VALUES (?, ?, ?)',
            [email, kodeOTP, waktuExpired]
        );

        // Kirim email (skip jika email belum dikonfigurasi)
        if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-email@gmail.com') {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'HadirinApp <noreply@hadirinapp.com>',
                to: email,
                subject: 'Kode OTP Reset Password - HadirinApp',
                html: `
                    <h2>Reset Password HadirinApp</h2>
                    <p>Kode OTP Anda adalah:</p>
                    <h1 style="color: #007bff; font-size: 32px;">${kodeOTP}</h1>
                    <p>Kode ini berlaku selama 10 menit.</p>
                    <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
                `
            };

            await transporter.sendMail(mailOptions);
        } else {
            console.log('📧 OTP Code (Email not configured):', kodeOTP);
        }

        res.json({
            success: true,
            message: 'Kode OTP telah dikirim ke email Anda'
        });

    } catch (error) {
        console.error('Error kirim OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim kode OTP'
        });
    }
};

// Verifikasi OTP
const verifikasiOTP = async (req, res) => {
    try {
        const { email, kode_otp } = req.body;
        const db = await getConnection();

        // Cek OTP
        const [otpData] = await db.execute(
            'SELECT * FROM lupa_password WHERE email = ? AND kode_otp = ? AND sudah_digunakan = 0 AND waktu_expired > NOW()',
            [email, kode_otp]
        );

        if (otpData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kode OTP tidak valid atau sudah expired'
            });
        }

        res.json({
            success: true,
            message: 'Kode OTP valid',
            token: otpData[0].id // Gunakan ID sebagai token sementara
        });

    } catch (error) {
        console.error('Error verifikasi OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memverifikasi kode OTP'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { email, kode_otp, password_baru } = req.body;
        const db = await getConnection();

        // Verifikasi OTP sekali lagi
        const [otpData] = await db.execute(
            'SELECT * FROM lupa_password WHERE email = ? AND kode_otp = ? AND sudah_digunakan = 0 AND waktu_expired > NOW()',
            [email, kode_otp]
        );

        if (otpData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kode OTP tidak valid atau sudah expired'
            });
        }

        // Hash password baru
        const hashedPassword = await bcrypt.hash(password_baru, 10);

        // Update password di tabel users
        await db.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        // Tandai OTP sudah digunakan
        await db.execute(
            'UPDATE lupa_password SET sudah_digunakan = 1 WHERE id = ?',
            [otpData[0].id]
        );

        res.json({
            success: true,
            message: 'Password berhasil direset'
        });

    } catch (error) {
        console.error('Error reset password:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mereset password'
        });
    }
};

module.exports = {
    kirimOTP,
    verifikasiOTP,
    resetPassword
};