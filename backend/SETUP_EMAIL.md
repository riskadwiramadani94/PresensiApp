# Setup Email Gmail untuk Fitur Lupa Password

## Langkah Setup Gmail:

### 1. Aktifkan 2-Step Verification
- Buka https://myaccount.google.com/security
- Pilih "2-Step Verification" 
- Ikuti instruksi untuk mengaktifkan

### 2. Generate App Password
- Masih di halaman Security
- Pilih "App passwords"
- Pilih "Mail" dan "Other (custom name)"
- Ketik "HadirinApp" 
- Copy password 16 digit yang dihasilkan

### 3. Update File .env
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # 16 digit app password
EMAIL_FROM=HadirinApp <noreply@hadirinapp.com>
```

### 4. Test Email Service
Jalankan server dan test endpoint:
```bash
cd backend
npm start

# Test di Postman atau curl:
POST http://localhost:3000/api/lupa-password/kirim-otp
{
  "email": "test@gmail.com"
}
```

## Troubleshooting:
- Pastikan 2-Step Verification aktif
- Gunakan App Password, bukan password Gmail biasa
- Cek spam folder jika email tidak masuk
- Pastikan email terdaftar di database users

## Flow Testing:
1. POST /api/lupa-password/kirim-otp → Cek email masuk
2. POST /api/lupa-password/verifikasi-otp → Input kode dari email  
3. POST /api/lupa-password/reset-password → Password berhasil direset