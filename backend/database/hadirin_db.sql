-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 01, 2026 at 11:00 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hadirin_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `absen_dinas`
--

CREATE TABLE `absen_dinas` (
  `id` int(11) NOT NULL,
  `id_dinas` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `tanggal_absen` date NOT NULL,
  `jam_masuk` time DEFAULT NULL,
  `jam_pulang` time DEFAULT NULL,
  `lintang_masuk` double DEFAULT NULL,
  `bujur_masuk` double DEFAULT NULL,
  `lintang_pulang` double DEFAULT NULL,
  `bujur_pulang` double DEFAULT NULL,
  `foto_masuk` varchar(255) DEFAULT NULL,
  `foto_pulang` varchar(255) DEFAULT NULL,
  `status` enum('hadir','terlambat','tidak_hadir') DEFAULT 'tidak_hadir',
  `keterangan` text DEFAULT NULL,
  `status_validasi` enum('menunggu','disetujui','ditolak') DEFAULT 'menunggu',
  `divalidasi_oleh` int(11) DEFAULT NULL,
  `catatan_validasi` text DEFAULT NULL,
  `waktu_validasi` timestamp NULL DEFAULT NULL,
  `lokasi_id` int(11) DEFAULT NULL COMMENT 'ID lokasi dinas tempat absen'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `absen_lembur`
--

CREATE TABLE `absen_lembur` (
  `id_absen_lembur` int(11) NOT NULL,
  `id_pengajuan` int(11) NOT NULL COMMENT 'Link ke pengajuan lembur',
  `id_user` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `jam_masuk` time DEFAULT NULL,
  `jam_pulang` time DEFAULT NULL,
  `lintang_masuk` double DEFAULT NULL,
  `bujur_masuk` double DEFAULT NULL,
  `lintang_pulang` double DEFAULT NULL,
  `bujur_pulang` double DEFAULT NULL,
  `foto_masuk` varchar(255) DEFAULT NULL,
  `foto_pulang` varchar(255) DEFAULT NULL,
  `total_jam` decimal(5,2) DEFAULT NULL COMMENT 'Otomatis dihitung',
  `lokasi_lembur` enum('kantor','dinas') DEFAULT 'kantor',
  `lokasi_id` int(11) DEFAULT NULL COMMENT 'ID lokasi kantor/dinas',
  `dinas_id` int(11) DEFAULT NULL COMMENT 'ID dinas jika lembur dinas',
  `status` enum('masuk','selesai') DEFAULT 'masuk',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dinas`
--

CREATE TABLE `dinas` (
  `id_dinas` int(11) NOT NULL,
  `nama_kegiatan` varchar(255) NOT NULL,
  `nomor_spt` varchar(100) NOT NULL,
  `jenis_dinas` enum('lokal','luar_kota','luar_negeri') NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date NOT NULL,
  `tipe_jam_kerja` enum('default','custom') DEFAULT 'default' COMMENT 'Tipe jam kerja: default=pakai jam_kerja_history, custom=pakai jam_mulai & jam_selesai',
  `alamat_lengkap` text NOT NULL,
  `lintang` decimal(10,8) NOT NULL,
  `bujur` decimal(11,8) NOT NULL,
  `radius_absen` int(11) NOT NULL DEFAULT 100,
  `jam_mulai` time DEFAULT NULL,
  `jam_selesai` time DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `dokumen_spt` varchar(255) DEFAULT NULL,
  `status` enum('aktif','selesai','dibatalkan') DEFAULT 'aktif',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dinas_lokasi`
--

CREATE TABLE `dinas_lokasi` (
  `id` int(11) NOT NULL,
  `id_dinas` int(11) NOT NULL,
  `id_lokasi_kantor` int(11) NOT NULL,
  `urutan` int(11) DEFAULT 1,
  `is_lokasi_utama` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_lokasi` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dinas_pegawai`
--

CREATE TABLE `dinas_pegawai` (
  `id` int(11) NOT NULL,
  `id_dinas` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `status_konfirmasi` enum('pending','konfirmasi','tolak') DEFAULT 'pending',
  `tanggal_konfirmasi` timestamp NULL DEFAULT NULL,
  `catatan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hari_libur`
--

CREATE TABLE `hari_libur` (
  `id` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `nama_libur` varchar(255) NOT NULL,
  `jenis` enum('nasional','keagamaan','perusahaan') DEFAULT 'nasional',
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jam_kerja_hari`
--

CREATE TABLE `jam_kerja_hari` (
  `id` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  `jam_masuk` time NOT NULL DEFAULT '08:00:00',
  `batas_absen` time NOT NULL DEFAULT '08:30:00',
  `jam_pulang` time NOT NULL DEFAULT '17:00:00',
  `is_kerja` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jam_kerja_history`
--

CREATE TABLE `jam_kerja_history` (
  `id` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  `jam_masuk` time NOT NULL,
  `batas_absen` time NOT NULL,
  `jam_pulang` time NOT NULL,
  `is_kerja` tinyint(1) NOT NULL DEFAULT 1,
  `tanggal_mulai_berlaku` date NOT NULL,
  `tanggal_selesai_berlaku` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lokasi_kantor`
--

CREATE TABLE `lokasi_kantor` (
  `id` int(11) NOT NULL,
  `nama_lokasi` varchar(255) NOT NULL,
  `alamat` text NOT NULL,
  `lintang` decimal(10,8) NOT NULL,
  `bujur` decimal(11,8) NOT NULL,
  `radius` int(11) DEFAULT NULL,
  `status` enum('aktif','nonaktif') DEFAULT 'aktif',
  `jenis_lokasi` enum('tetap','dinas') DEFAULT 'tetap',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `tanggal_mulai_dinas` date DEFAULT NULL,
  `tanggal_selesai_dinas` date DEFAULT NULL,
  `keterangan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lokasi_realtime`
--

CREATE TABLE `lokasi_realtime` (
  `id` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `lintang` double NOT NULL,
  `bujur` double NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pegawai`
--

CREATE TABLE `pegawai` (
  `id_pegawai` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `nama_lengkap` varchar(100) DEFAULT NULL,
  `nip` varchar(20) DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `no_telepon` varchar(15) DEFAULT NULL,
  `jabatan` varchar(100) DEFAULT NULL,
  `divisi` varchar(100) DEFAULT NULL,
  `tanggal_masuk` date DEFAULT NULL,
  `foto_profil` varchar(255) DEFAULT NULL,
  `status_pegawai` enum('Aktif','Tidak Aktif') DEFAULT 'Aktif',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pengajuan`
--

CREATE TABLE `pengajuan` (
  `id_pengajuan` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `id_pegawai` int(11) DEFAULT NULL,
  `jenis_pengajuan` enum('izin_datang_terlambat','izin_pulang_cepat','cuti_sakit','cuti_alasan_penting','cuti_tahunan','lembur') NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date DEFAULT NULL,
  `jam_mulai` time DEFAULT NULL,
  `jam_selesai` time DEFAULT NULL,
  `alasan_text` text NOT NULL,
  `dokumen_foto` varchar(255) DEFAULT NULL,
  `status` enum('menunggu','disetujui','ditolak') DEFAULT 'menunggu',
  `is_retrospektif` tinyint(1) DEFAULT 0,
  `disetujui_oleh` int(11) DEFAULT NULL,
  `tanggal_pengajuan` timestamp NOT NULL DEFAULT current_timestamp(),
  `waktu_persetujuan` timestamp NULL DEFAULT NULL,
  `catatan_persetujuan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pengaturan_sistem`
--

CREATE TABLE `pengaturan_sistem` (
  `id` int(11) NOT NULL,
  `key_setting` varchar(100) NOT NULL,
  `value` text NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `presensi`
--

CREATE TABLE `presensi` (
  `id_presensi` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `tanggal` date DEFAULT NULL,
  `jam_masuk` time DEFAULT NULL,
  `lintang_masuk` double DEFAULT NULL,
  `bujur_masuk` double DEFAULT NULL,
  `foto_masuk` varchar(255) DEFAULT NULL,
  `status` enum('Hadir','Tidak Hadir','Terlambat','Izin','Sakit','Cuti','Pulang Cepat','Dinas Luar/ Perjalanan Dinas') DEFAULT NULL,
  `alasan_luar_lokasi` text DEFAULT NULL,
  `jam_pulang` time DEFAULT NULL,
  `lintang_pulang` double DEFAULT NULL,
  `bujur_pulang` double DEFAULT NULL,
  `foto_pulang` varchar(255) DEFAULT NULL,
  `status_validasi` enum('menunggu','disetujui','ditolak') DEFAULT 'disetujui',
  `divalidasi_oleh` int(11) DEFAULT NULL,
  `catatan_validasi` text DEFAULT NULL,
  `waktu_validasi` timestamp NULL DEFAULT NULL,
  `lokasi_id` int(11) DEFAULT NULL COMMENT 'ID lokasi tempat absen',
  `jenis_presensi` enum('kantor','dinas') DEFAULT 'kantor' COMMENT 'Jenis presensi',
  `dinas_id` int(11) DEFAULT NULL COMMENT 'ID dinas jika absen dinas'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `presensi_backup_before_fix`
--

CREATE TABLE `presensi_backup_before_fix` (
  `id_presensi` int(11) NOT NULL DEFAULT 0,
  `id_user` int(11) DEFAULT NULL,
  `tanggal` date DEFAULT NULL,
  `jam_masuk` time DEFAULT NULL,
  `lintang_masuk` double DEFAULT NULL,
  `bujur_masuk` double DEFAULT NULL,
  `foto_masuk` varchar(255) DEFAULT NULL,
  `status` enum('Hadir','Tidak Hadir','Terlambat','Izin','Sakit','Cuti','Pulang Cepat','Dinas Luar/ Perjalanan Dinas') DEFAULT NULL,
  `alasan_luar_lokasi` text DEFAULT NULL,
  `jam_pulang` time DEFAULT NULL,
  `lintang_pulang` double DEFAULT NULL,
  `bujur_pulang` double DEFAULT NULL,
  `foto_pulang` varchar(255) DEFAULT NULL,
  `status_validasi` enum('menunggu','disetujui','ditolak') DEFAULT 'disetujui',
  `divalidasi_oleh` int(11) DEFAULT NULL,
  `catatan_validasi` text DEFAULT NULL,
  `waktu_validasi` timestamp NULL DEFAULT NULL,
  `lokasi_id` int(11) DEFAULT NULL COMMENT 'ID lokasi tempat absen',
  `jenis_presensi` enum('kantor','dinas') DEFAULT 'kantor' COMMENT 'Jenis presensi',
  `dinas_id` int(11) DEFAULT NULL COMMENT 'ID dinas jika absen dinas'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id_user` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','pegawai') NOT NULL,
  `nama_lengkap` varchar(100) DEFAULT NULL,
  `foto_profil` varchar(255) DEFAULT NULL,
  `no_telepon` varchar(15) DEFAULT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `absen_dinas`
--
ALTER TABLE `absen_dinas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_dinas` (`id_dinas`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `fk_absen_dinas_lokasi` (`lokasi_id`);

--
-- Indexes for table `absen_lembur`
--
ALTER TABLE `absen_lembur`
  ADD PRIMARY KEY (`id_absen_lembur`),
  ADD KEY `fk_absen_lembur_pengajuan` (`id_pengajuan`),
  ADD KEY `fk_absen_lembur_user` (`id_user`),
  ADD KEY `fk_absen_lembur_lokasi` (`lokasi_id`),
  ADD KEY `fk_absen_lembur_dinas` (`dinas_id`);

--
-- Indexes for table `dinas`
--
ALTER TABLE `dinas`
  ADD PRIMARY KEY (`id_dinas`),
  ADD UNIQUE KEY `nomor_spt` (`nomor_spt`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `dinas_lokasi`
--
ALTER TABLE `dinas_lokasi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_dinas_lokasi` (`id_dinas`,`id_lokasi_kantor`),
  ADD KEY `idx_dinas` (`id_dinas`),
  ADD KEY `idx_lokasi` (`id_lokasi_kantor`);

--
-- Indexes for table `dinas_pegawai`
--
ALTER TABLE `dinas_pegawai`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_dinas` (`id_dinas`),
  ADD KEY `id_user` (`id_user`);

--
-- Indexes for table `hari_libur`
--
ALTER TABLE `hari_libur`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `jam_kerja_hari`
--
ALTER TABLE `jam_kerja_hari`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `hari` (`hari`);

--
-- Indexes for table `jam_kerja_history`
--
ALTER TABLE `jam_kerja_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_hari_tanggal` (`hari`,`tanggal_mulai_berlaku`);

--
-- Indexes for table `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jenis_lokasi` (`jenis_lokasi`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `lokasi_realtime`
--
ALTER TABLE `lokasi_realtime`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_user` (`id_user`);

--
-- Indexes for table `pegawai`
--
ALTER TABLE `pegawai`
  ADD PRIMARY KEY (`id_pegawai`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `fk_user_pegawai` (`id_user`);

--
-- Indexes for table `pengajuan`
--
ALTER TABLE `pengajuan`
  ADD PRIMARY KEY (`id_pengajuan`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `approved_by` (`disetujui_oleh`),
  ADD KEY `fk_pegawai_pengajuan` (`id_pegawai`);

--
-- Indexes for table `pengaturan_sistem`
--
ALTER TABLE `pengaturan_sistem`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key_setting` (`key_setting`);

--
-- Indexes for table `presensi`
--
ALTER TABLE `presensi`
  ADD PRIMARY KEY (`id_presensi`),
  ADD UNIQUE KEY `unique_user_date` (`id_user`,`tanggal`),
  ADD KEY `fk_presensi_lokasi` (`lokasi_id`),
  ADD KEY `fk_presensi_dinas` (`dinas_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `absen_dinas`
--
ALTER TABLE `absen_dinas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `absen_lembur`
--
ALTER TABLE `absen_lembur`
  MODIFY `id_absen_lembur` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dinas`
--
ALTER TABLE `dinas`
  MODIFY `id_dinas` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dinas_lokasi`
--
ALTER TABLE `dinas_lokasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dinas_pegawai`
--
ALTER TABLE `dinas_pegawai`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hari_libur`
--
ALTER TABLE `hari_libur`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jam_kerja_hari`
--
ALTER TABLE `jam_kerja_hari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jam_kerja_history`
--
ALTER TABLE `jam_kerja_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lokasi_realtime`
--
ALTER TABLE `lokasi_realtime`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pegawai`
--
ALTER TABLE `pegawai`
  MODIFY `id_pegawai` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pengajuan`
--
ALTER TABLE `pengajuan`
  MODIFY `id_pengajuan` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pengaturan_sistem`
--
ALTER TABLE `pengaturan_sistem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `presensi`
--
ALTER TABLE `presensi`
  MODIFY `id_presensi` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `absen_dinas`
--
ALTER TABLE `absen_dinas`
  ADD CONSTRAINT `absen_dinas_ibfk_1` FOREIGN KEY (`id_dinas`) REFERENCES `dinas` (`id_dinas`) ON DELETE CASCADE,
  ADD CONSTRAINT `absen_dinas_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_absen_dinas_lokasi` FOREIGN KEY (`lokasi_id`) REFERENCES `lokasi_kantor` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `absen_lembur`
--
ALTER TABLE `absen_lembur`
  ADD CONSTRAINT `fk_absen_lembur_dinas` FOREIGN KEY (`dinas_id`) REFERENCES `dinas` (`id_dinas`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_absen_lembur_lokasi` FOREIGN KEY (`lokasi_id`) REFERENCES `lokasi_kantor` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_absen_lembur_pengajuan` FOREIGN KEY (`id_pengajuan`) REFERENCES `pengajuan` (`id_pengajuan`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_absen_lembur_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `dinas`
--
ALTER TABLE `dinas`
  ADD CONSTRAINT `dinas_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_user`);

--
-- Constraints for table `dinas_pegawai`
--
ALTER TABLE `dinas_pegawai`
  ADD CONSTRAINT `dinas_pegawai_ibfk_1` FOREIGN KEY (`id_dinas`) REFERENCES `dinas` (`id_dinas`) ON DELETE CASCADE,
  ADD CONSTRAINT `dinas_pegawai_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `lokasi_realtime`
--
ALTER TABLE `lokasi_realtime`
  ADD CONSTRAINT `fk_lokasi_realtime_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `pegawai`
--
ALTER TABLE `pegawai`
  ADD CONSTRAINT `fk_user_pegawai` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `pengajuan`
--
ALTER TABLE `pengajuan`
  ADD CONSTRAINT `fk_pegawai_pengajuan` FOREIGN KEY (`id_pegawai`) REFERENCES `pegawai` (`id_pegawai`) ON DELETE CASCADE,
  ADD CONSTRAINT `pengajuan_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `pengajuan_ibfk_2` FOREIGN KEY (`disetujui_oleh`) REFERENCES `users` (`id_user`) ON DELETE SET NULL;

--
-- Constraints for table `presensi`
--
ALTER TABLE `presensi`
  ADD CONSTRAINT `fk_presensi_dinas` FOREIGN KEY (`dinas_id`) REFERENCES `dinas` (`id_dinas`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_presensi_lokasi` FOREIGN KEY (`lokasi_id`) REFERENCES `lokasi_kantor` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_presensi` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


-- ========================================
-- INSERT FAQ DATA - HADIRINAPP
-- Total: 80 FAQ
-- ========================================

-- ========================================
-- FAQ KATEGORI: PRESENSI (15 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('presensi', 'Bagaimana cara melakukan presensi masuk?', 'Buka menu Presensi (tombol tengah), pastikan GPS aktif, ambil foto selfie, lalu tekan tombol Absen Masuk. Pastikan Anda berada dalam radius lokasi kantor.', 1),
('presensi', 'Bagaimana cara melakukan presensi pulang?', 'Buka menu Presensi, ambil foto selfie, lalu tekan tombol Absen Pulang. Presensi pulang hanya bisa dilakukan setelah Anda melakukan presensi masuk.', 2),
('presensi', 'Berapa radius lokasi yang diperbolehkan untuk absen?', 'Radius lokasi ditentukan oleh admin, biasanya 50-200 meter dari titik lokasi kantor. Anda akan melihat notifikasi jika berada di luar radius.', 3),
('presensi', 'Apa yang harus dilakukan jika lupa absen masuk?', 'Segera hubungi admin/HRD untuk melakukan pengajuan retrospektif. Anda perlu memberikan alasan dan bukti pendukung.', 4),
('presensi', 'Apa yang harus dilakukan jika lupa absen pulang?', 'Hubungi admin/HRD untuk koreksi data presensi. Sistem akan mencatat jam pulang default jika tidak ada absen pulang.', 5),
('presensi', 'Mengapa foto selfie diperlukan saat presensi?', 'Foto selfie digunakan untuk verifikasi kehadiran dan memastikan bahwa yang melakukan presensi adalah pegawai yang bersangkutan.', 6),
('presensi', 'Apa perbedaan status Hadir dan Terlambat?', 'Status Hadir jika absen sebelum batas waktu yang ditentukan. Status Terlambat jika absen setelah batas waktu (biasanya 08:30).', 7),
('presensi', 'Bagaimana jika lokasi GPS tidak akurat?', 'Pastikan GPS aktif dan izin lokasi diberikan ke aplikasi. Coba keluar ruangan atau restart aplikasi. Jika masih bermasalah, hubungi admin.', 8),
('presensi', 'Jam berapa batas waktu absen masuk?', 'Batas waktu absen masuk biasanya 08:30 WIB. Setelah jam tersebut, status akan berubah menjadi Terlambat. Cek jam kerja di dashboard.', 9),
('presensi', 'Apakah bisa absen jika sedang dinas?', 'Ya, gunakan menu Dinas untuk absen saat perjalanan dinas. Lokasi absen akan disesuaikan dengan lokasi dinas yang ditentukan.', 10),
('presensi', 'Bagaimana cara melihat riwayat presensi?', 'Buka menu Presensi dari dashboard, pilih "Riwayat Presensi". Anda bisa filter berdasarkan harian, mingguan, bulanan, atau tahunan.', 11),
('presensi', 'Apa itu status "Belum Waktunya"?', 'Status ini muncul untuk tanggal yang belum tiba atau di luar jam kerja. Presensi hanya bisa dilakukan pada hari dan jam kerja yang ditentukan.', 12),
('presensi', 'Bagaimana cara melihat laporan presensi bulanan?', 'Buka Riwayat Presensi, pilih "Laporan Bulanan", lalu pilih bulan dan tahun yang diinginkan. Anda akan melihat statistik lengkap.', 13),
('presensi', 'Apa yang dimaksud dengan total jam kerja?', 'Total jam kerja adalah akumulasi waktu dari absen masuk hingga absen pulang dalam periode tertentu (harian/bulanan).', 14),
('presensi', 'Bagaimana cara filter riwayat presensi?', 'Di halaman Riwayat Presensi, klik tombol filter di atas. Pilih jenis laporan (harian/mingguan/bulanan/tahunan) dan periode yang diinginkan.', 15);

-- ========================================
-- FAQ KATEGORI: PENGAJUAN (18 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('pengajuan', 'Bagaimana cara mengajukan izin datang terlambat?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Izin Datang Terlambat", isi tanggal, jam rencana datang, dan alasan. Klik Kirim Pengajuan.', 1),
('pengajuan', 'Bagaimana cara mengajukan izin pulang cepat?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Izin Pulang Cepat", isi tanggal, jam rencana pulang, dan alasan. Klik Kirim Pengajuan.', 2),
('pengajuan', 'Bagaimana cara mengajukan cuti sakit?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Cuti Sakit", isi periode cuti, upload surat dokter (opsional), dan alasan. Klik Kirim.', 3),
('pengajuan', 'Bagaimana cara mengajukan cuti tahunan?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Cuti Tahunan", isi periode cuti dan alasan. Pastikan kuota cuti tahunan Anda masih tersedia.', 4),
('pengajuan', 'Bagaimana cara mengajukan cuti alasan penting?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Cuti Alasan Penting", isi periode dan alasan yang jelas. Contoh: acara keluarga, keperluan mendesak.', 5),
('pengajuan', 'Bagaimana cara mengajukan lembur?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Lembur", isi periode lembur, jam mulai-selesai, dan alasan. Tunggu persetujuan sebelum melakukan absen lembur.', 6),
('pengajuan', 'Berapa lama proses persetujuan pengajuan?', 'Proses persetujuan biasanya 1-3 hari kerja. Anda akan mendapat notifikasi di Kotak Masuk saat pengajuan disetujui atau ditolak.', 7),
('pengajuan', 'Apakah bisa membatalkan pengajuan yang sudah diajukan?', 'Pengajuan yang masih berstatus "Menunggu" bisa dibatalkan dengan menghubungi admin. Pengajuan yang sudah disetujui/ditolak tidak bisa dibatalkan.', 8),
('pengajuan', 'Apa itu pengajuan retrospektif?', 'Pengajuan retrospektif adalah pengajuan yang dibuat setelah tanggal kejadian berlalu. Ditandai dengan badge "Telat Ngajuin" dan memerlukan persetujuan khusus.', 9),
('pengajuan', 'Apakah perlu melampirkan dokumen untuk pengajuan?', 'Untuk Cuti Sakit, disarankan melampirkan surat dokter. Untuk pengajuan lain, dokumen bersifat opsional tergantung kebijakan perusahaan.', 10),
('pengajuan', 'Bagaimana cara melihat status pengajuan?', 'Buka menu Pengajuan, Anda akan melihat daftar pengajuan dengan status: Menunggu (orange), Disetujui (hijau), atau Ditolak (merah).', 11),
('pengajuan', 'Apa yang harus dilakukan jika pengajuan ditolak?', 'Lihat catatan admin di detail pengajuan untuk mengetahui alasan penolakan. Anda bisa mengajukan ulang dengan perbaikan sesuai catatan.', 12),
('pengajuan', 'Bagaimana cara upload surat dokter untuk cuti sakit?', 'Saat mengisi form Cuti Sakit, klik tombol "Upload Surat Dokter", pilih foto dari galeri atau ambil foto langsung. Ukuran maksimal 5MB.', 13),
('pengajuan', 'Apa perbedaan cuti sakit dan cuti alasan penting?', 'Cuti Sakit untuk kondisi kesehatan (perlu surat dokter). Cuti Alasan Penting untuk keperluan mendesak non-kesehatan (acara keluarga, dll).', 14),
('pengajuan', 'Bagaimana cara melihat catatan admin pada pengajuan?', 'Klik pengajuan yang ingin dilihat, scroll ke bawah ke bagian "Catatan Admin". Catatan akan muncul jika admin memberikan keterangan.', 15),
('pengajuan', 'Apa yang dimaksud dengan "Telat Ngajuin"?', 'Badge ini muncul jika Anda mengajukan izin/cuti setelah tanggal kejadian. Contoh: mengajukan izin tanggal 1 pada tanggal 3.', 16),
('pengajuan', 'Bagaimana cara filter pengajuan berdasarkan status?', 'Di halaman Pengajuan, klik icon filter (3 garis horizontal), pilih status: Semua, Menunggu, Disetujui, atau Ditolak.', 17),
('pengajuan', 'Bagaimana cara mencari pengajuan tertentu?', 'Gunakan kolom pencarian di atas daftar pengajuan. Anda bisa cari berdasarkan jenis pengajuan, tanggal, atau kata kunci dalam alasan.', 18);

-- ========================================
-- FAQ KATEGORI: DINAS (12 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('dinas', 'Apa itu kegiatan dinas?', 'Kegiatan dinas adalah penugasan resmi dari perusahaan untuk melakukan pekerjaan di luar lokasi kantor, bisa lokal, luar kota, atau luar negeri.', 1),
('dinas', 'Bagaimana cara melihat jadwal dinas saya?', 'Buka menu Dinas dari dashboard. Anda akan melihat daftar kegiatan dinas dengan status: Akan Datang, Berlangsung, atau Selesai.', 2),
('dinas', 'Apa perbedaan dinas lokal, luar kota, dan luar negeri?', 'Dinas Lokal: dalam kota. Dinas Luar Kota: antar kota/provinsi. Dinas Luar Negeri: ke negara lain. Perbedaan ada pada tunjangan dan prosedur.', 3),
('dinas', 'Apa itu Nomor SPT?', 'SPT (Surat Perintah Tugas) adalah nomor resmi penugasan dinas. Setiap kegiatan dinas memiliki nomor SPT unik sebagai bukti penugasan resmi.', 4),
('dinas', 'Bagaimana cara absen saat dinas?', 'Saat berada di lokasi dinas, buka menu Dinas, pilih kegiatan yang sedang berlangsung, lalu klik Absen Masuk/Pulang sesuai jadwal.', 5),
('dinas', 'Apakah bisa absen dinas di beberapa lokasi?', 'Ya, jika kegiatan dinas mencakup beberapa lokasi, admin akan mengatur multiple lokasi. Anda bisa absen di lokasi mana saja yang sudah ditentukan.', 6),
('dinas', 'Bagaimana jika lokasi dinas berbeda dengan yang tertera?', 'Hubungi admin segera untuk update lokasi dinas. Absen di luar lokasi yang ditentukan akan ditolak sistem atau perlu validasi manual.', 7),
('dinas', 'Apa yang dimaksud status "Akan Datang", "Berlangsung", dan "Selesai"?', 'Akan Datang: dinas belum dimulai. Berlangsung: dinas sedang berjalan (bisa absen). Selesai: dinas sudah berakhir (tidak bisa absen).', 8),
('dinas', 'Bagaimana cara melihat detail kegiatan dinas?', 'Klik card kegiatan dinas di daftar. Anda akan melihat detail lengkap: nama kegiatan, nomor SPT, periode, lokasi, dan peserta.', 9),
('dinas', 'Bagaimana cara filter kegiatan dinas?', 'Klik icon filter di halaman Dinas, pilih status: Semua, Akan Datang, Berlangsung, atau Selesai untuk melihat dinas sesuai kategori.', 10),
('dinas', 'Apakah absen dinas perlu validasi?', 'Ya, absen dinas akan divalidasi oleh admin untuk memastikan kehadiran sesuai dengan lokasi dan jadwal yang ditentukan.', 11),
('dinas', 'Bagaimana jika tidak bisa mengikuti dinas yang sudah dijadwalkan?', 'Segera hubungi admin/atasan untuk memberitahu. Anda mungkin perlu mengajukan izin atau akan ada penggantian peserta dinas.', 12);

-- ========================================
-- FAQ KATEGORI: LEMBUR (15 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('lembur', 'Bagaimana cara mengajukan lembur?', 'Buka menu Pengajuan > Tambah Pengajuan, pilih "Lembur", isi periode lembur, jam mulai-selesai, dan alasan. Tunggu persetujuan sebelum absen.', 1),
('lembur', 'Bagaimana cara absen lembur masuk?', 'Setelah pengajuan disetujui, buka menu Lembur pada hari H, pastikan dalam radius lokasi dan sesuai jadwal, lalu klik Absen Masuk dan ambil foto.', 2),
('lembur', 'Bagaimana cara absen lembur pulang?', 'Setelah selesai lembur, buka menu Lembur, klik Absen Pulang pada card lembur yang aktif, ambil foto selfie. Jam lembur akan dihitung otomatis.', 3),
('lembur', 'Apakah jam lembur dihitung otomatis?', 'Ya, sistem akan menghitung total jam lembur berdasarkan selisih waktu absen masuk dan absen pulang secara otomatis.', 4),
('lembur', 'Apa perbedaan lembur kantor dan lembur dinas?', 'Lembur Kantor: dilakukan di lokasi kantor. Lembur Dinas: dilakukan di lokasi dinas. Lokasi absen akan disesuaikan dengan jenis lembur.', 5),
('lembur', 'Berapa lama proses persetujuan lembur?', 'Proses persetujuan lembur biasanya 1-2 hari kerja. Pastikan mengajukan minimal H-1 sebelum jadwal lembur.', 6),
('lembur', 'Bagaimana cara melihat riwayat lembur?', 'Buka menu Lembur, pilih tab "Riwayat". Anda akan melihat semua riwayat lembur dengan total jam dan periode.', 7),
('lembur', 'Apa yang dimaksud "Siap Absen"?', 'Status ini muncul jika Anda berada dalam radius lokasi dan sesuai jadwal lembur. Tombol absen akan aktif dan bisa diklik.', 8),
('lembur', 'Apa yang dimaksud "Di Luar Radius"?', 'Status ini muncul jika Anda berada di luar radius lokasi yang ditentukan. Anda perlu mendekati lokasi untuk bisa absen.', 9),
('lembur', 'Apa yang dimaksud "Belum Waktunya"?', 'Status ini muncul jika waktu saat ini belum sesuai jadwal lembur. Absen hanya bisa dilakukan sesuai jam yang diajukan.', 10),
('lembur', 'Apakah bisa lembur tanpa pengajuan?', 'Tidak, semua lembur harus melalui pengajuan dan mendapat persetujuan terlebih dahulu. Absen lembur tanpa pengajuan tidak akan tercatat.', 11),
('lembur', 'Bagaimana jika lupa absen lembur?', 'Segera hubungi admin untuk koreksi data. Anda perlu memberikan bukti pendukung bahwa benar-benar melakukan lembur.', 12),
('lembur', 'Berapa radius lokasi untuk absen lembur?', 'Radius lokasi lembur sama dengan radius presensi normal, biasanya 50-200 meter. Cek jarak Anda di card lembur (ditampilkan dalam meter).', 13),
('lembur', 'Apakah perlu foto selfie saat absen lembur?', 'Ya, foto selfie wajib untuk verifikasi kehadiran saat absen masuk dan pulang lembur, sama seperti presensi normal.', 14),
('lembur', 'Bagaimana cara melihat total jam lembur?', 'Total jam lembur ditampilkan di card riwayat lembur. Anda juga bisa melihat akumulasi jam lembur bulanan di dashboard.', 15);

-- ========================================
-- FAQ KATEGORI: PROFIL (8 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('profil', 'Bagaimana cara mengubah foto profil?', 'Buka menu Profil, klik foto profil, pilih "Ubah Foto". Anda bisa ambil foto baru atau pilih dari galeri. Ukuran maksimal 2MB.', 1),
('profil', 'Bagaimana cara mengubah data pribadi?', 'Buka menu Profil, klik tombol Edit. Anda bisa mengubah nomor telepon dan data lain yang diizinkan. Data seperti NIP tidak bisa diubah sendiri.', 2),
('profil', 'Bagaimana cara mengganti password?', 'Buka menu Profil, scroll ke bawah, klik "Ubah Password". Masukkan password lama, password baru, dan konfirmasi password baru.', 3),
('profil', 'Bagaimana cara mengubah nomor telepon?', 'Buka menu Profil, klik Edit, ubah nomor telepon di field yang tersedia, lalu klik Simpan. Nomor telepon digunakan untuk notifikasi penting.', 4),
('profil', 'Apakah bisa mengubah email?', 'Email tidak bisa diubah sendiri karena digunakan untuk login. Jika perlu mengubah email, hubungi admin/HRD dengan alasan yang jelas.', 5),
('profil', 'Bagaimana cara melihat informasi jabatan dan divisi?', 'Buka menu Profil, informasi jabatan dan divisi ditampilkan di bagian atas profil di bawah nama Anda.', 6),
('profil', 'Data apa saja yang bisa saya ubah sendiri?', 'Anda bisa mengubah: foto profil, nomor telepon, dan password. Data lain seperti nama, NIP, jabatan, divisi hanya bisa diubah oleh admin.', 7),
('profil', 'Bagaimana jika data pribadi saya salah?', 'Hubungi admin/HRD untuk koreksi data. Berikan informasi yang benar dan dokumen pendukung jika diperlukan.', 8);

-- ========================================
-- FAQ KATEGORI: UMUM (12 FAQ)
-- ========================================
INSERT INTO faq (kategori, pertanyaan, jawaban, urutan) VALUES
('umum', 'Bagaimana cara menghubungi admin/HRD?', 'Buka menu Bantuan, pilih salah satu metode kontak: WhatsApp, Email, atau Telepon. Anda juga bisa menghubungi langsung ke kantor HRD.', 1),
('umum', 'Apa yang harus dilakukan jika aplikasi error?', 'Coba restart aplikasi atau clear cache. Jika masih error, uninstall dan install ulang aplikasi. Jika tetap bermasalah, hubungi admin IT.', 2),
('umum', 'Bagaimana cara logout dari aplikasi?', 'Buka menu Profil, scroll ke bawah, klik tombol "Keluar" atau "Logout". Anda akan diminta konfirmasi sebelum logout.', 3),
('umum', 'Apakah aplikasi bisa digunakan offline?', 'Tidak, aplikasi memerlukan koneksi internet untuk sinkronisasi data. Pastikan Anda terhubung ke internet saat menggunakan aplikasi.', 4),
('umum', 'Mengapa aplikasi meminta izin lokasi?', 'Izin lokasi diperlukan untuk verifikasi kehadiran saat presensi. Sistem akan memastikan Anda berada di lokasi yang ditentukan saat absen.', 5),
('umum', 'Mengapa aplikasi meminta izin kamera?', 'Izin kamera diperlukan untuk mengambil foto selfie saat presensi sebagai bukti kehadiran dan verifikasi identitas pegawai.', 6),
('umum', 'Bagaimana cara update aplikasi?', 'Buka Play Store (Android) atau App Store (iOS), cari "HadirinApp", klik Update jika ada versi baru. Atau aktifkan auto-update di pengaturan store.', 7),
('umum', 'Apa yang harus dilakukan jika lupa password?', 'Di halaman login, klik "Lupa Password", masukkan email Anda. Link reset password akan dikirim ke email. Ikuti instruksi untuk reset password.', 8),
('umum', 'Bagaimana cara melihat notifikasi di kotak masuk?', 'Buka menu Kotak Masuk (icon amplop di bottom navigation). Anda akan melihat semua notifikasi: persetujuan pengajuan, pengumuman, dll.', 9),
('umum', 'Apakah data saya aman di aplikasi ini?', 'Ya, semua data dienkripsi dan disimpan dengan aman. Aplikasi menggunakan protokol keamanan standar industri untuk melindungi data pribadi Anda.', 10),
('umum', 'Bagaimana cara menggunakan fitur search/pencarian?', 'Setiap halaman yang memiliki fitur search akan menampilkan kolom pencarian di atas. Ketik kata kunci minimal 2 karakter untuk mencari.', 11),
('umum', 'Apa fungsi dashboard pegawai?', 'Dashboard menampilkan ringkasan: status absensi hari ini, jam kerja, dan akses cepat ke menu utama (Presensi, Pengajuan, Dinas, Lembur).', 12);
