-- Migration: Tambah tabel jam_kerja_history untuk menyimpan historis perubahan jam kerja
-- Tanggal: 2025-01-17
-- Tujuan: Agar perubahan jam kerja tidak mempengaruhi data historis laporan

-- Buat tabel jam_kerja_history
CREATE TABLE IF NOT EXISTS jam_kerja_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hari ENUM('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  jam_masuk TIME NOT NULL,
  batas_absen TIME NOT NULL,
  jam_pulang TIME NOT NULL,
  is_kerja BOOLEAN NOT NULL DEFAULT 1,
  tanggal_mulai_berlaku DATE NOT NULL,
  tanggal_selesai_berlaku DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hari_tanggal (hari, tanggal_mulai_berlaku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Isi data awal dari jam_kerja_hari (anggap berlaku sejak 1 Jan 2024)
INSERT INTO jam_kerja_history 
  (hari, jam_masuk, batas_absen, jam_pulang, is_kerja, tanggal_mulai_berlaku)
SELECT 
  hari, 
  jam_masuk, 
  batas_absen, 
  jam_pulang, 
  is_kerja, 
  '2024-01-01' as tanggal_mulai_berlaku
FROM jam_kerja_hari
WHERE NOT EXISTS (
  SELECT 1 FROM jam_kerja_history WHERE jam_kerja_history.hari = jam_kerja_hari.hari
);

-- Verifikasi data
SELECT * FROM jam_kerja_history ORDER BY hari;
