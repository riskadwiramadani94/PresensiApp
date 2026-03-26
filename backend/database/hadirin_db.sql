-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 25, 2026 at 04:53 PM
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
  `id_lokasi_kantor` int(11) DEFAULT NULL COMMENT 'ID lokasi kantor',
  `status` enum('masuk','selesai') DEFAULT 'masuk',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `face_confidence` decimal(5,2) DEFAULT NULL COMMENT 'Tingkat kemiripan wajah (0-100)'
) ;

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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `dinas_lokasi`
--

CREATE TABLE `dinas_lokasi` (
  `id_dinas_lokasi` int(11) NOT NULL,
  `id_dinas` int(11) NOT NULL,
  `id_lokasi_kantor` int(11) NOT NULL,
  `urutan` int(11) DEFAULT 1,
  `is_lokasi_utama` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dinas_pegawai`
--

CREATE TABLE `dinas_pegawai` (
  `id_dinas_pegawai` int(11) NOT NULL,
  `id_dinas` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `status_konfirmasi` enum('pending','konfirmasi','tolak') DEFAULT 'pending',
  `tanggal_konfirmasi` timestamp NULL DEFAULT NULL,
  `catatan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `faq`
--

CREATE TABLE `faq` (
  `id_faq` int(11) NOT NULL,
  `kategori` enum('presensi','pengajuan','dinas','lembur','profil','umum','pegawai_akun','validasi','kelola_dinas','laporan','pengaturan','tracking') NOT NULL,
  `role` enum('pegawai','admin','both') DEFAULT 'pegawai',
  `pertanyaan` varchar(255) NOT NULL,
  `jawaban` text NOT NULL,
  `urutan` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hari_libur`
--

CREATE TABLE `hari_libur` (
  `id_hari_libur` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `nama_libur` varchar(255) NOT NULL,
  `jenis` enum('nasional','keagamaan','perusahaan') DEFAULT 'nasional',
  `is_active` tinyint(1) DEFAULT 1
) ;

-- --------------------------------------------------------

--
-- Table structure for table `jam_kerja_hari`
--

CREATE TABLE `jam_kerja_hari` (
  `id_jam_kerja_hari` int(11) NOT NULL,
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
  `id_jam_kerja_history` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  `jam_masuk` time NOT NULL,
  `batas_absen` time NOT NULL,
  `jam_pulang` time NOT NULL,
  `is_kerja` tinyint(1) NOT NULL DEFAULT 1,
  `tanggal_mulai_berlaku` date NOT NULL,
  `tanggal_selesai_berlaku` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `lokasi_kantor`
--

CREATE TABLE `lokasi_kantor` (
  `id_lokasi_kantor` int(11) NOT NULL,
  `nama_lokasi` varchar(255) NOT NULL,
  `alamat` text NOT NULL,
  `lintang` decimal(10,8) NOT NULL,
  `bujur` decimal(11,8) NOT NULL,
  `radius` int(11) DEFAULT NULL,
  `status` enum('aktif','nonaktif') DEFAULT 'aktif',
  `jenis_lokasi` enum('tetap','dinas') DEFAULT 'tetap',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `keterangan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lokasi_realtime`
--

CREATE TABLE `lokasi_realtime` (
  `id_lokasi_realtime` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `lintang` double NOT NULL,
  `bujur` double NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lupa_password`
--

CREATE TABLE `lupa_password` (
  `id_lupa_password` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `kode_otp` varchar(6) NOT NULL,
  `waktu_expired` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sudah_digunakan` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifikasi`
--

CREATE TABLE `notifikasi` (
  `id_notifikasi` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `judul` varchar(255) NOT NULL,
  `pesan` text NOT NULL,
  `tipe` enum('reminder_masuk','reminder_pulang','pengajuan','approval','info') DEFAULT 'info',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `pengajuan`
--

CREATE TABLE `pengajuan` (
  `id_pengajuan` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
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
) ;

-- --------------------------------------------------------

--
-- Table structure for table `pengaturan_sistem`
--

CREATE TABLE `pengaturan_sistem` (
  `id_pengaturan_sistem` int(11) NOT NULL,
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
  `id_lokasi_kantor` int(11) DEFAULT NULL COMMENT 'ID lokasi tempat absen',
  `jenis_presensi` enum('kantor','dinas') DEFAULT 'kantor' COMMENT 'Jenis presensi',
  `id_dinas` int(11) DEFAULT NULL COMMENT 'ID dinas jika absen dinas',
  `status_validasi_masuk` enum('menunggu','disetujui','ditolak') DEFAULT 'menunggu',
  `status_validasi_pulang` enum('menunggu','disetujui','ditolak') DEFAULT NULL,
  `divalidasi_masuk_oleh` int(11) DEFAULT NULL,
  `divalidasi_pulang_oleh` int(11) DEFAULT NULL,
  `waktu_validasi_masuk` timestamp NULL DEFAULT NULL,
  `waktu_validasi_pulang` timestamp NULL DEFAULT NULL,
  `catatan_validasi_masuk` text DEFAULT NULL,
  `catatan_validasi_pulang` text DEFAULT NULL,
  `face_confidence` decimal(5,2) DEFAULT NULL COMMENT 'Tingkat kemiripan wajah (0-100)'
) ;

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `face_embedding` longtext DEFAULT NULL COMMENT 'Data wajah dalam format JSON array 128 dimensi',
  `face_setup_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu setup wajah pertama kali'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_devices`
--

CREATE TABLE `user_devices` (
  `id_device` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `push_token` varchar(255) NOT NULL,
  `device_type` enum('android','ios') NOT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_active` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `absen_lembur`
--
ALTER TABLE `absen_lembur`
  ADD PRIMARY KEY (`id_absen_lembur`),
  ADD KEY `fk_absen_lembur_pengajuan` (`id_pengajuan`),
  ADD KEY `fk_absen_lembur_user` (`id_user`),
  ADD KEY `fk_absen_lembur_lokasi` (`id_lokasi_kantor`);

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
  ADD PRIMARY KEY (`id_dinas_lokasi`),
  ADD UNIQUE KEY `unique_dinas_lokasi` (`id_dinas`,`id_lokasi_kantor`),
  ADD KEY `idx_id_dinas` (`id_dinas`),
  ADD KEY `idx_id_lokasi_kantor` (`id_lokasi_kantor`);

--
-- Indexes for table `dinas_pegawai`
--
ALTER TABLE `dinas_pegawai`
  ADD PRIMARY KEY (`id_dinas_pegawai`),
  ADD KEY `id_dinas` (`id_dinas`),
  ADD KEY `id_user` (`id_user`);

--
-- Indexes for table `faq`
--
ALTER TABLE `faq`
  ADD PRIMARY KEY (`id_faq`);

--
-- Indexes for table `hari_libur`
--
ALTER TABLE `hari_libur`
  ADD PRIMARY KEY (`id_hari_libur`);

--
-- Indexes for table `jam_kerja_hari`
--
ALTER TABLE `jam_kerja_hari`
  ADD PRIMARY KEY (`id_jam_kerja_hari`),
  ADD UNIQUE KEY `hari` (`hari`);

--
-- Indexes for table `jam_kerja_history`
--
ALTER TABLE `jam_kerja_history`
  ADD PRIMARY KEY (`id_jam_kerja_history`),
  ADD KEY `idx_hari_tanggal` (`hari`,`tanggal_mulai_berlaku`);

--
-- Indexes for table `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  ADD PRIMARY KEY (`id_lokasi_kantor`),
  ADD KEY `idx_jenis_lokasi` (`jenis_lokasi`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `lokasi_realtime`
--
ALTER TABLE `lokasi_realtime`
  ADD PRIMARY KEY (`id_lokasi_realtime`),
  ADD UNIQUE KEY `id_user` (`id_user`);

--
-- Indexes for table `lupa_password`
--
ALTER TABLE `lupa_password`
  ADD PRIMARY KEY (`id_lupa_password`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_kode_otp` (`kode_otp`),
  ADD KEY `idx_waktu_expired` (`waktu_expired`),
  ADD KEY `idx_email_kode` (`email`,`kode_otp`);

--
-- Indexes for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD PRIMARY KEY (`id_notifikasi`),
  ADD KEY `fk_notifikasi_user` (`id_user`),
  ADD KEY `idx_user_read` (`id_user`, `is_read`);

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
  ADD KEY `approved_by` (`disetujui_oleh`);

--
-- Indexes for table `pengaturan_sistem`
--
ALTER TABLE `pengaturan_sistem`
  ADD PRIMARY KEY (`id_pengaturan_sistem`),
  ADD UNIQUE KEY `key_setting` (`key_setting`);

--
-- Indexes for table `presensi`
--
ALTER TABLE `presensi`
  ADD PRIMARY KEY (`id_presensi`),
  ADD UNIQUE KEY `unique_user_date_jenis` (`id_user`,`tanggal`,`jenis_presensi`),
  ADD KEY `fk_presensi_lokasi_kantor` (`id_lokasi_kantor`),
  ADD KEY `fk_presensi_dinas` (`id_dinas`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_devices`
--
ALTER TABLE `user_devices`
  ADD PRIMARY KEY (`id_device`),
  ADD KEY `idx_user_active` (`id_user`,`is_active`);

--
-- AUTO_INCREMENT for dumped tables
--

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
  MODIFY `id_dinas_lokasi` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dinas_pegawai`
--
ALTER TABLE `dinas_pegawai`
  MODIFY `id_dinas_pegawai` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `faq`
--
ALTER TABLE `faq`
  MODIFY `id_faq` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hari_libur`
--
ALTER TABLE `hari_libur`
  MODIFY `id_hari_libur` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jam_kerja_hari`
--
ALTER TABLE `jam_kerja_hari`
  MODIFY `id_jam_kerja_hari` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jam_kerja_history`
--
ALTER TABLE `jam_kerja_history`
  MODIFY `id_jam_kerja_history` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  MODIFY `id_lokasi_kantor` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lokasi_realtime`
--
ALTER TABLE `lokasi_realtime`
  MODIFY `id_lokasi_realtime` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lupa_password`
--
ALTER TABLE `lupa_password`
  MODIFY `id_lupa_password` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifikasi`
--
ALTER TABLE `notifikasi`
  MODIFY `id_notifikasi` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id_pengaturan_sistem` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `user_devices`
--
ALTER TABLE `user_devices`
  MODIFY `id_device` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `absen_lembur`
--
ALTER TABLE `absen_lembur`
  ADD CONSTRAINT `fk_absen_lembur_lokasi_kantor` FOREIGN KEY (`id_lokasi_kantor`) REFERENCES `lokasi_kantor` (`id_lokasi_kantor`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_absen_lembur_pengajuan` FOREIGN KEY (`id_pengajuan`) REFERENCES `pengajuan` (`id_pengajuan`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_absen_lembur_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `dinas`
--
ALTER TABLE `dinas`
  ADD CONSTRAINT `dinas_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_user`);

--
-- Constraints for table `dinas_lokasi`
--
ALTER TABLE `dinas_lokasi`
  ADD CONSTRAINT `fk_dinas_lokasi_dinas` FOREIGN KEY (`id_dinas`) REFERENCES `dinas` (`id_dinas`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dinas_lokasi_lokasi_kantor` FOREIGN KEY (`id_lokasi_kantor`) REFERENCES `lokasi_kantor` (`id_lokasi_kantor`) ON DELETE CASCADE;

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
-- Constraints for table `lupa_password`
--
ALTER TABLE `lupa_password`
  ADD CONSTRAINT `fk_lupa_password_email` FOREIGN KEY (`email`) REFERENCES `users` (`email`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifikasi`
--
ALTER TABLE `notifikasi`
  ADD CONSTRAINT `fk_notifikasi_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `pegawai`
--
ALTER TABLE `pegawai`
  ADD CONSTRAINT `fk_user_pegawai` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `pengajuan`
--
ALTER TABLE `pengajuan`
  ADD CONSTRAINT `pengajuan_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `pengajuan_ibfk_2` FOREIGN KEY (`disetujui_oleh`) REFERENCES `users` (`id_user`) ON DELETE SET NULL;

--
-- Constraints for table `presensi`
--
ALTER TABLE `presensi`
  ADD CONSTRAINT `fk_presensi_dinas` FOREIGN KEY (`id_dinas`) REFERENCES `dinas` (`id_dinas`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_presensi_lokasi_kantor` FOREIGN KEY (`id_lokasi_kantor`) REFERENCES `lokasi_kantor` (`id_lokasi_kantor`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_presensi` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Constraints for table `user_devices`
--
ALTER TABLE `user_devices`
  ADD CONSTRAINT `user_devices_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
