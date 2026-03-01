-- Migration: Tambah field tipe_jam_kerja di tabel dinas
-- Tanggal: 2026-03-01
-- Tujuan: Menambahkan pilihan jam kerja default atau custom untuk dinas

-- Langkah 1: Tambah field tipe_jam_kerja
ALTER TABLE dinas 
ADD COLUMN tipe_jam_kerja ENUM('default', 'custom') 
DEFAULT 'default' 
COMMENT 'Tipe jam kerja: default=pakai jam_kerja_history, custom=pakai jam_mulai & jam_selesai'
AFTER tanggal_selesai;

-- Langkah 2: Update data dinas yang sudah ada
-- Set 'custom' untuk dinas yang sudah punya jam_mulai & jam_selesai
UPDATE dinas 
SET tipe_jam_kerja = 'custom' 
WHERE jam_mulai IS NOT NULL AND jam_selesai IS NOT NULL;

-- Set 'default' untuk dinas yang belum punya jam custom
UPDATE dinas 
SET tipe_jam_kerja = 'default' 
WHERE jam_mulai IS NULL OR jam_selesai IS NULL;

-- Verifikasi hasil
SELECT 
    id_dinas,
    nama_kegiatan,
    tipe_jam_kerja,
    jam_mulai,
    jam_selesai
FROM dinas
ORDER BY id_dinas DESC
LIMIT 10;
