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
                from: process.env.EMAIL_FROM || 'Presensi <noreply@presensi.com>',
                to: email,
                subject: 'Kode Verifikasi Reset Password',
                html: `
                    <!DOCTYPE html>
                    <html lang="id">
                    <head>
                      <meta charset="UTF-8" />
                      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                      <title>Kode Verifikasi</title>
                    </head>
                    
                    <body style="margin:0; padding:0; background:#eef2f7; font-family: 'Segoe UI', Arial, sans-serif;">
                    
                      <div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#ffffff; opacity:0;">
                        KODE OTP: ${kodeOTP}. Berlaku 10 menit. Jangan bagikan kode ini kepada siapapun.
                        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
                        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
                        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
                        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
                        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
                      </div>
                    
                      <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
                        <tr>
                          <td align="center">
                    
                            <table width="600" cellpadding="0" cellspacing="0" 
                              style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.12);">
                              
                              <tr>
                                <td align="center" 
                                  style="padding:48px 32px; background:linear-gradient(135deg,#4CAF50,#45a049);">
                                  <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:600;">
                                    Keamanan Akun
                                  </h1>
                                  <p style="margin:8px 0 0; color:#c8e6c9; font-size:14px;">
                                    Verifikasi diperlukan untuk melanjutkan
                                  </p>
                                </td>
                              </tr>
                    
                              <tr>
                                <td style="padding:40px;">
                    
                                  <h2 style="margin:0 0 16px; font-size:22px; color:#111827; text-align:center;">
                                    Reset Password
                                  </h2>
                    
                                  <p style="margin:0 0 28px; color:#374151; font-size:15px; line-height:1.8; text-align:center;">
                                    Kami menerima permintaan reset password. Gunakan kode berikut untuk melanjutkan.
                                  </p>
                    
                                  <table width="100%" cellpadding="0" cellspacing="0" 
                                    style="background:#f0fdf4; border-radius:14px; padding:32px; text-align:center; border:1px solid #bbf7d0;">
                                    <tr>
                                      <td>
                                        <p style="margin:0 0 10px; font-size:13px; letter-spacing:1.5px; color:#166534; font-weight:600;">
                                          KODE VERIFIKASI
                                        </p>
                                        <p style="margin:0; font-size:44px; letter-spacing:12px; font-weight:700; color:#15803d; font-family:'Courier New', monospace;">
                                          ${kodeOTP}
                                        </p>
                                      </td>
                                    </tr>
                                  </table>
                    
                                  <p style="margin:24px 0 0; color:#6b7280; font-size:14px; text-align:center;">
                                    Kode ini berlaku selama <strong>10 menit</strong>. <br>
                                    Demi keamanan, jangan berikan kode ini kepada pihak manapun termasuk pihak <strong>Presensi Digital</strong>.
                                  </p>
                    
                                </td>
                              </tr>
                    
                              <tr>
                                <td align="center" 
                                  style="padding:24px 40px; background:#f9fafb; border-top:1px solid #e5e7eb;">
                                  <p style="margin:0; font-size:12px; color:#9ca3af;">
                                    Email ini dikirim otomatis, mohon tidak membalas.
                                  </p>
                                  <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">
                                    © 2026 Presensi Digital
                                  </p>
                                </td>
                              </tr>
                    
                            </table>
                    
                          </td>
                        </tr>
                      </table>
                    </body>
                    </html>
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
            token: otpData[0].id
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

        const hashedPassword = await bcrypt.hash(password_baru, 10);

        await db.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

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