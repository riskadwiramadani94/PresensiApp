-- Script untuk menghapus semua data absen dinas
-- HATI-HATI: Script ini akan menghapus SEMUA data terkait dinas dan absen dinas

-- 1. Hapus data presensi yang terkait dengan dinas
DELETE FROM presensi WHERE jenis_presensi = 'dinas' OR dinas_id IS NOT NULL;

-- 2. Hapus data absen lembur yang terkait dengan dinas
DELETE FROM absen_lembur WHERE dinas_id IS NOT NULL;

-- 3. Hapus relasi pegawai dengan dinas
DELETE FROM dinas_pegawai;

-- 4. Hapus relasi lokasi dengan dinas
DELETE FROM dinas_lokasi;

-- 5. Hapus data dinas
DELETE FROM dinas;

-- 6. Reset AUTO_INCREMENT untuk tabel yang dikosongkan
ALTER TABLE dinas AUTO_INCREMENT = 1;
ALTER TABLE dinas_pegawai AUTO_INCREMENT = 1;
ALTER TABLE dinas_lokasi AUTO_INCREMENT = 1;

-- Tampilkan hasil penghapusan
SELECT 'Data absen dinas berhasil dihapus' as status;