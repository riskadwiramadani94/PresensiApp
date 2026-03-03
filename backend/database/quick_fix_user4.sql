-- QUICK FIX: Hapus data duplikat user 4 hari ini (2026-03-02)

-- 1. CEK DATA SEBELUM HAPUS
SELECT * FROM presensi WHERE id_user = 4 AND DATE(tanggal) = '2026-03-02';

-- 2. HAPUS SEMUA DATA HARI INI
DELETE FROM presensi WHERE id_user = 4 AND DATE(tanggal) = '2026-03-02';

-- 3. VERIFIKASI SUDAH BERSIH
SELECT * FROM presensi WHERE id_user = 4 AND DATE(tanggal) = '2026-03-02';

-- 4. SEKARANG COBA ABSEN LAGI DARI APLIKASI
