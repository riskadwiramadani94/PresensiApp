-- Migration: Update enum tipe di tabel notifikasi
-- Menambahkan tipe notifikasi yang lebih lengkap untuk routing

ALTER TABLE `notifikasi` 
MODIFY COLUMN `tipe` ENUM(
  'absen_masuk',
  'absen_pulang',
  'absen_dinas_masuk',
  'absen_dinas_pulang',
  'pengajuan_baru',
  'pengajuan_approved',
  'pengajuan_rejected',
  'dinas_assigned',
  'dinas_cancelled',
  'validasi_absen_dinas_approved',
  'validasi_absen_dinas_rejected',
  'reminder_masuk',
  'reminder_pulang',
  'reminder_terlambat',
  'lembur_approved',
  'lembur_rejected',
  'info'
) DEFAULT 'info';
