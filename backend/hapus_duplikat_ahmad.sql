-- Hapus data duplikat untuk user_id = 4, tanggal = 2026-02-26
-- Jalankan di phpMyAdmin

-- 1. Cek data yang ada
SELECT * FROM presensi 
WHERE id_user = 4 AND DATE(tanggal) = '2026-02-26'
ORDER BY id_presensi;

-- 2. Hapus semua data untuk tanggal tersebut
DELETE FROM presensi 
WHERE id_user = 4 AND DATE(tanggal) = '2026-02-26';

-- 3. Verifikasi sudah terhapus
SELECT * FROM presensi 
WHERE id_user = 4 AND DATE(tanggal) = '2026-02-26';
-- Harus return 0 rows

-- Sekarang bisa absen lagi!
