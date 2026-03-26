-- Script: Update tipe notifikasi lama yang sudah ada
-- Mengubah tipe berdasarkan pattern judul notifikasi

-- Update notifikasi absen masuk
UPDATE `notifikasi` 
SET `tipe` = 'absen_masuk' 
WHERE `judul` LIKE '%Absen Masuk%' 
  OR `judul` LIKE '%📍 Absen Masuk%'
  OR `pesan` LIKE '%telah melakukan absen masuk%';

-- Update notifikasi absen pulang
UPDATE `notifikasi` 
SET `tipe` = 'absen_pulang' 
WHERE `judul` LIKE '%Absen Pulang%' 
  OR `judul` LIKE '%📍 Absen Pulang%'
  OR `pesan` LIKE '%telah melakukan absen pulang%';

-- Update notifikasi absen dinas masuk
UPDATE `notifikasi` 
SET `tipe` = 'absen_dinas_masuk' 
WHERE `judul` LIKE '%Absen Dinas Masuk%' 
  OR `pesan` LIKE '%absen masuk dinas%';

-- Update notifikasi absen dinas pulang
UPDATE `notifikasi` 
SET `tipe` = 'absen_dinas_pulang' 
WHERE `judul` LIKE '%Absen Dinas Pulang%' 
  OR `pesan` LIKE '%absen pulang dinas%';

-- Update notifikasi pengajuan baru
UPDATE `notifikasi` 
SET `tipe` = 'pengajuan_baru' 
WHERE `judul` LIKE '%Pengajuan Baru%' 
  OR `judul` LIKE '%📝 Pengajuan%'
  OR `pesan` LIKE '%mengajukan%';

-- Update notifikasi pengajuan disetujui
UPDATE `notifikasi` 
SET `tipe` = 'pengajuan_approved' 
WHERE `judul` LIKE '%Disetujui%' 
  OR `judul` LIKE '%✅%'
  OR `pesan` LIKE '%telah disetujui%';

-- Update notifikasi pengajuan ditolak
UPDATE `notifikasi` 
SET `tipe` = 'pengajuan_rejected' 
WHERE `judul` LIKE '%Ditolak%' 
  OR `judul` LIKE '%❌%'
  OR `pesan` LIKE '%telah ditolak%';

-- Update notifikasi dinas assigned
UPDATE `notifikasi` 
SET `tipe` = 'dinas_assigned' 
WHERE `judul` LIKE '%Penugasan Dinas%' 
  OR `judul` LIKE '%✈️%'
  OR `pesan` LIKE '%ditugaskan untuk dinas%';

-- Update notifikasi reminder
UPDATE `notifikasi` 
SET `tipe` = 'reminder_masuk' 
WHERE `judul` LIKE '%Reminder%Masuk%' 
  OR `judul` LIKE '%Waktunya Absen Masuk%';

UPDATE `notifikasi` 
SET `tipe` = 'reminder_pulang' 
WHERE `judul` LIKE '%Reminder%Pulang%' 
  OR `judul` LIKE '%Waktunya Absen Pulang%';

UPDATE `notifikasi` 
SET `tipe` = 'reminder_terlambat' 
WHERE `judul` LIKE '%Terlambat%' 
  OR `judul` LIKE '%⚠️%';

-- Cek hasil update
SELECT tipe, COUNT(*) as jumlah 
FROM notifikasi 
GROUP BY tipe 
ORDER BY jumlah DESC;
