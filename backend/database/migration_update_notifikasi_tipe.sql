-- Migration: Update enum tipe di tabel notifikasi
ALTER TABLE `notifikasi` 
MODIFY COLUMN `tipe` enum(
  'reminder_masuk',
  'reminder_pulang',
  'reminder_terlambat',
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
  'lembur_approved',
  'lembur_rejected',
  'hari_libur',
  'pengajuan',
  'approval',
  'info'
) DEFAULT 'info';
