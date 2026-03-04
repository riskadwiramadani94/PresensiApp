-- ========================================
-- UPDATE DINAS STATUS ENUM
-- Mengubah status dari ('aktif','selesai','dibatalkan') 
-- menjadi ('akan_datang','sedang_berlangsung','selesai')
-- ========================================

-- Backup data existing terlebih dahulu
CREATE TABLE IF NOT EXISTS dinas_backup_status AS SELECT * FROM dinas;

-- Update existing data sebelum mengubah enum
-- Mapping: aktif -> sedang_berlangsung, selesai -> selesai, dibatalkan -> selesai
UPDATE dinas SET status = 'sedang_berlangsung' WHERE status = 'aktif';
-- status 'selesai' tetap 'selesai'
UPDATE dinas SET status = 'selesai' WHERE status = 'dibatalkan';

-- Ubah enum status di tabel dinas
ALTER TABLE dinas MODIFY COLUMN status ENUM('akan_datang','sedang_berlangsung','selesai') DEFAULT 'akan_datang';

-- Verifikasi perubahan
SELECT DISTINCT status FROM dinas;

-- Query untuk melihat struktur tabel yang sudah diupdate
DESCRIBE dinas;