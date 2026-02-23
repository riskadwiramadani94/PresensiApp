-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 22, 2026 at 01:04 PM
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

--
-- Dumping data for table `absen_dinas`
--

INSERT INTO `absen_dinas` (`id`, `id_dinas`, `id_user`, `tanggal_absen`, `jam_masuk`, `jam_pulang`, `lintang_masuk`, `bujur_masuk`, `lintang_pulang`, `bujur_pulang`, `foto_masuk`, `foto_pulang`, `status`, `keterangan`, `status_validasi`, `divalidasi_oleh`, `catatan_validasi`, `waktu_validasi`, `lokasi_id`) VALUES
(1, 11, 4, '2026-02-12', '08:15:00', '17:05:00', -6.8915, 107.6107, -6.8915, 107.6107, 'contoh-masuk.jpeg', 'contoh-pulang.jpeg', 'hadir', 'Absen dinas di ITB Ganesha', 'disetujui', 10, NULL, '2026-02-12 13:38:42', 6),
(2, 14, 14, '2026-02-15', '23:48:21', NULL, -6.9246033, 107.73872, NULL, NULL, 'presensi-1771174101064-652895280.jpeg', NULL, 'terlambat', NULL, 'disetujui', 10, NULL, '2026-02-15 16:53:54', 9),
(3, 14, 14, '2026-02-17', '09:54:19', NULL, -6.9245236, 107.7386592, NULL, NULL, 'presensi-1771296858799-478538382.jpg', NULL, 'terlambat', NULL, 'disetujui', 10, NULL, '2026-02-17 02:57:55', 9),
(4, 14, 12, '2026-02-17', '09:56:55', NULL, -6.9245236, 107.7386592, NULL, NULL, 'presensi-1771297015814-339250204.jpg', NULL, 'terlambat', NULL, 'disetujui', 10, NULL, '2026-02-17 02:57:55', 9),
(5, 15, 2, '2026-02-17', '10:04:27', NULL, -6.9245236, 107.7386592, NULL, NULL, 'presensi-1771297466912-507699700.jpg', NULL, 'terlambat', NULL, 'disetujui', 10, NULL, '2026-02-18 07:33:08', 9),
(6, 15, 5, '2026-02-17', '10:06:27', NULL, -6.9245236, 107.7386592, NULL, NULL, 'presensi-1771297586135-423020720.jpg', NULL, 'terlambat', NULL, 'menunggu', NULL, NULL, NULL, 9);

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

--
-- Dumping data for table `dinas`
--

INSERT INTO `dinas` (`id_dinas`, `nama_kegiatan`, `nomor_spt`, `jenis_dinas`, `tanggal_mulai`, `tanggal_selesai`, `alamat_lengkap`, `lintang`, `bujur`, `radius_absen`, `jam_mulai`, `jam_selesai`, `deskripsi`, `dokumen_spt`, `status`, `created_by`, `created_at`) VALUES
(10, 'Rapat', 'STP 002', 'lokal', '2026-01-20', '2026-01-22', 'Lokasi Dinas', -6.89150000, 107.61070000, 100, NULL, NULL, '', NULL, 'aktif', 10, '2026-01-20 04:00:49'),
(11, 'rapat', 'Spt/001', 'luar_kota', '2026-02-03', '2026-02-13', 'Lokasi Dinas', -6.89150000, 107.61070000, 100, NULL, NULL, '', NULL, 'aktif', 10, '2026-02-02 06:57:04'),
(12, 'Tes', 'Tes', 'luar_kota', '2026-02-15', '2026-02-27', 'Lokasi Dinas', -6.89150000, 107.61070000, 100, NULL, NULL, 'Tes', 'SPT-1771164972005-362882441.pdf', 'aktif', 10, '2026-02-04 02:40:14'),
(14, 'RAPAT', 'SPT/002/2026', 'lokal', '2026-02-15', '2026-02-17', '', 0.00000000, 0.00000000, 100, NULL, NULL, 'RAPAT DEWAN', 'SPT-1771170330169-97597411.pdf', 'aktif', 10, '2026-02-15 15:45:33'),
(15, 'Rapat koordinasi', 'SPT/003/2026', 'lokal', '2026-02-17', '2026-02-19', '', 0.00000000, 0.00000000, 100, NULL, NULL, 'Rapat', 'SPT-1771297421427-74713260.pdf', 'aktif', 10, '2026-02-17 03:03:42');

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

--
-- Dumping data for table `dinas_lokasi`
--

INSERT INTO `dinas_lokasi` (`id`, `id_dinas`, `id_lokasi_kantor`, `urutan`, `is_lokasi_utama`, `created_at`, `id_lokasi`) VALUES
(1, 10, 6, 1, 0, '2026-01-20 04:00:49', 6),
(2, 11, 6, 1, 1, '2026-02-06 08:25:52', 6),
(4, 11, 1, 2, 0, '2026-02-06 08:49:54', 1),
(9, 12, 6, 1, 1, '2026-02-15 15:02:07', 6),
(10, 14, 6, 1, 1, '2026-02-15 15:45:33', 6),
(11, 14, 9, 2, 0, '2026-02-15 15:45:33', 9),
(12, 15, 9, 1, 1, '2026-02-17 03:03:42', 9);

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

--
-- Dumping data for table `dinas_pegawai`
--

INSERT INTO `dinas_pegawai` (`id`, `id_dinas`, `id_user`, `status_konfirmasi`, `tanggal_konfirmasi`, `catatan`) VALUES
(8, 10, 4, 'konfirmasi', '2026-01-20 04:00:49', NULL),
(9, 10, 2, 'konfirmasi', '2026-01-20 04:00:49', NULL),
(10, 10, 5, 'konfirmasi', '2026-01-20 04:00:49', NULL),
(11, 11, 4, 'konfirmasi', '2026-02-02 06:57:04', NULL),
(12, 11, 2, 'konfirmasi', '2026-02-02 06:57:04', NULL),
(20, 12, 4, 'konfirmasi', '2026-02-15 15:02:08', NULL),
(21, 12, 13, 'konfirmasi', '2026-02-15 15:02:08', NULL),
(22, 14, 14, 'konfirmasi', '2026-02-15 15:45:33', NULL),
(23, 14, 12, 'konfirmasi', '2026-02-15 15:45:33', NULL),
(24, 15, 2, 'konfirmasi', '2026-02-17 03:03:42', NULL),
(25, 15, 5, 'konfirmasi', '2026-02-17 03:03:42', NULL);

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

--
-- Dumping data for table `hari_libur`
--

INSERT INTO `hari_libur` (`id`, `tanggal`, `nama_libur`, `jenis`, `is_active`) VALUES
(1, '2026-01-15', 'Isra mi\'raj', 'keagamaan', 0),
(2, '2025-12-31', 'Libur', 'nasional', 0),
(3, '2026-01-15', 'Isra mi\'raj', 'keagamaan', 0),
(4, '2026-01-16', 'Isra Mi\'raj', 'keagamaan', 0),
(5, '2026-01-16', 'Isra Mi\'raj', 'keagamaan', 0),
(6, '2026-01-01', 'Tahun Baru 2026', 'nasional', 0),
(7, '2026-01-14', 'Libur', 'nasional', 0),
(8, '2026-01-01', 'Tahun Baru', 'nasional', 0),
(9, '2026-01-01', 'Tahun Baru', 'nasional', 0),
(10, '2026-01-01', 'Tahun baru', 'nasional', 1),
(11, '2026-02-05', 'Tes', 'nasional', 0),
(12, '2026-02-11', 'idul fitri', 'nasional', 0),
(13, '2026-02-13', 'Libur', 'nasional', 0),
(14, '2026-02-13', 'Libur', 'nasional', 0),
(15, '2026-02-13', 'Libur', 'nasional', 1);

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

--
-- Dumping data for table `jam_kerja_hari`
--

INSERT INTO `jam_kerja_hari` (`id`, `hari`, `jam_masuk`, `batas_absen`, `jam_pulang`, `is_kerja`) VALUES
(1, 'Senin', '08:00:00', '08:30:00', '17:00:00', 1),
(2, 'Selasa', '08:00:00', '08:30:00', '17:00:00', 1),
(3, 'Rabu', '08:00:00', '08:30:00', '17:00:00', 1),
(4, 'Kamis', '08:00:00', '08:30:00', '17:00:00', 1),
(5, 'Jumat', '08:00:00', '08:30:00', '16:30:00', 1),
(6, 'Sabtu', '08:00:00', '08:30:00', '12:00:00', 0),
(7, 'Minggu', '08:00:00', '08:30:00', '17:00:00', 0);

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

--
-- Dumping data for table `lokasi_kantor`
--

INSERT INTO `lokasi_kantor` (`id`, `nama_lokasi`, `alamat`, `lintang`, `bujur`, `radius`, `status`, `jenis_lokasi`, `is_active`, `tanggal_mulai_dinas`, `tanggal_selesai_dinas`, `keterangan`) VALUES
(1, 'ITB SUMARECON', 'Jalan Bulevar Raya, Cisaranten Kidul, Kecamatan Gedebage, Jawa Barat', -6.95317191, 107.69658610, 100, 'aktif', 'tetap', 1, NULL, NULL, NULL),
(6, 'Itb Ganesha', 'Jalan Ganesa 10, Lebak Siliwangi, Kecamatan Coblong, Jawa Barat', -6.89036170, 107.61019120, 300, 'aktif', 'dinas', 1, NULL, NULL, NULL),
(8, 'ITB Innovation Park (IIP) Bandung Technopolis di Summarecon Bandung', 'Jalan Sentra Niaga II, Cisaranten Kidul, Gedebage, Kota Bandung, Jawa Barat, Jawa, 40295, Indonesia', -6.95346850, 107.69637540, 300, 'aktif', 'tetap', 0, NULL, NULL, NULL),
(9, 'Kantor', 'kp sukahayu, No. No.48, Cinunuk, Kecamatan Cileunyi, Jawa Barat, 40624', -6.92468330, 107.73865170, 100, 'aktif', 'tetap', 1, NULL, NULL, NULL),
(10, 'Kantor Cabang', 'Jalan Jakarta, Kebonwaru, Kecamatan Batununggal, Jawa Barat', -6.91558281, 107.63843782, 100, 'aktif', 'tetap', 0, NULL, NULL, NULL),
(11, 'Kiara Artha', 'Kebonwaru, Kecamatan Batununggal, Jawa Barat', -6.91655802, 107.64228109, 100, 'aktif', 'tetap', 1, NULL, NULL, NULL),
(12, 'Tes', 'Cimenyan, Bandung, West Java', -6.86441171, 107.67373938, 100, 'aktif', 'dinas', 1, NULL, NULL, NULL),
(13, 'Tes', 'Cibeunying, Kecamatan Cimenyan, Jawa Barat', -6.88636649, 107.63615761, 100, 'aktif', 'tetap', 0, NULL, NULL, NULL);

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

--
-- Dumping data for table `lokasi_realtime`
--

INSERT INTO `lokasi_realtime` (`id`, `id_user`, `lintang`, `bujur`, `last_update`) VALUES
(1, 6, -6.9535981, 107.6963557, '2026-02-18 05:54:02'),
(2, 5, -6.9535981, 107.6963557, '2026-02-18 05:54:23'),
(3, 4, -6.9245255, 107.7386685, '2026-02-22 06:28:25'),
(29, 14, -6.9535364, 107.6963279, '2026-02-20 05:27:35'),
(40, 2, -6.9245183, 107.7386678, '2026-02-22 07:40:50');

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

--
-- Dumping data for table `pegawai`
--

INSERT INTO `pegawai` (`id_pegawai`, `id_user`, `nama_lengkap`, `nip`, `jenis_kelamin`, `tanggal_lahir`, `alamat`, `no_telepon`, `jabatan`, `divisi`, `tanggal_masuk`, `foto_profil`, `status_pegawai`, `created_at`, `updated_at`) VALUES
(1, 2, 'Budi Santoso', 'NIP001', 'Laki-laki', '1990-05-15', 'Jl. Merdeka No. 123, Jakarta', '081234567890', 'Manager IT', 'IT', '2020-01-15', NULL, 'Aktif', '2026-01-15 01:29:42', '2026-01-15 01:29:42'),
(3, 4, 'Ahmad Fauzi Rahman', 'NIP003', 'Laki-laki', '1988-12-04', 'Jl. Gatot Subroto No. 789, Jakarta', '081234567892', 'Supervisor Finance', 'Finance', '2019-06-01', 'uploads/pegawai/pegawai-1770869195075-145906349.jpeg', 'Aktif', '2026-01-15 01:29:42', '2026-02-12 04:06:35'),
(4, 5, 'Dewi Lestari', 'NIP004', 'Perempuan', '1995-03-25', 'Jl. Thamrin No. 321, Jakarta', '081234567893', 'Staff Marketing', 'Marketing', '2021-02-15', NULL, 'Aktif', '2026-01-15 01:29:42', '2026-01-15 01:29:42'),
(5, 6, 'Eko Prasetyo', 'NIP005', 'Laki-laki', '1991-07-18', 'Jl. Kuningan No. 654, Jakarta', '081234567894', 'Staff IT', 'IT', '2021-08-20', NULL, 'Aktif', '2026-01-15 01:29:42', '2026-01-15 01:29:42'),
(11, 12, 'Riska Dwi Ramadani ', 'R00233', 'Perempuan', '0000-00-00', '', '', 'IT', 'IT', '2026-01-19', NULL, 'Aktif', '2026-01-19 03:46:32', '2026-01-19 03:46:32'),
(12, 9, 'Riska', 'PEG000009', '', NULL, '', '', 'Staff', 'Umum', NULL, NULL, 'Aktif', '2026-01-22 02:26:42', '2026-01-22 02:26:42'),
(13, 13, 'Cindy Yuliani ', 'C0001', 'Perempuan', '0000-00-00', 'Cisarua', '08379157216', 'IT', 'IT', '2026-02-04', NULL, 'Aktif', '2026-02-04 02:39:32', '2026-02-04 02:39:32'),
(14, 14, 'Riska Fauziah', 'R0002', '', '0000-00-00', '', '', 'IT', 'IT', '2026-02-15', 'uploads/pegawai/pegawai-1771165140496-25793115.jpeg', 'Aktif', '2026-02-15 11:41:14', '2026-02-15 14:19:01'),
(15, 15, 'Razka', 'R0001', 'Laki-laki', '0000-00-00', 'Ciborelang ', '083187554543', 'It', 'It', '2026-02-18', NULL, 'Aktif', '2026-02-18 12:40:37', '2026-02-18 12:40:37');

-- --------------------------------------------------------

--
-- Table structure for table `pengajuan`
--

CREATE TABLE `pengajuan` (
  `id_pengajuan` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `id_pegawai` int(11) DEFAULT NULL,
  `jenis_pengajuan` enum('izin_datang_terlambat', 'izin_pulang_cepat', 'cuti_sakit', 'cuti_alasan_penting', 'cuti_tahunan', 'lembur') NOT NULL,
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

--
-- Dumping data for table `presensi`
--

INSERT INTO `presensi` (`id_presensi`, `id_user`, `tanggal`, `jam_masuk`, `lintang_masuk`, `bujur_masuk`, `foto_masuk`, `status`, `alasan_luar_lokasi`, `jam_pulang`, `lintang_pulang`, `bujur_pulang`, `foto_pulang`, `status_validasi`, `divalidasi_oleh`, `catatan_validasi`, `waktu_validasi`, `lokasi_id`, `jenis_presensi`, `dinas_id`) VALUES
(42, 6, '2026-02-17', '10:28:36', -6.9245228, 107.7386607, 'presensi-1771298912200-807782190.jpeg', 'Terlambat', NULL, NULL, NULL, NULL, NULL, 'disetujui', NULL, NULL, NULL, 9, 'kantor', NULL);

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
-- Dumping data for table `users`
--

INSERT INTO `users` (`id_user`, `email`, `password`, `role`, `nama_lengkap`, `foto_profil`, `no_telepon`, `device_id`, `created_at`) VALUES
(2, 'budi@itb.ac.id', '$2y$10$ghBDG.IOG/dPTExfmkFIRuRU9E9Fpg2BBw5Jm26vdv2yREJSXKekS', 'pegawai', NULL, NULL, NULL, 'device_001', '2026-01-15 01:29:42'),
(4, 'ahmad@itb.ac.id', '$2a$10$modElJESC/0h0CcpUcFf4u51wgwDFh3MixwTjKSEfaosE9tuKihO.', 'pegawai', NULL, NULL, NULL, 'device_003', '2026-01-15 01:29:42'),
(5, 'dewi@itb.ac.id', '$2y$10$ghBDG.IOG/dPTExfmkFIRuRU9E9Fpg2BBw5Jm26vdv2yREJSXKekS', 'pegawai', NULL, NULL, NULL, 'device_004', '2026-01-15 01:29:42'),
(6, 'eko@itb.ac.id', '$2y$10$ghBDG.IOG/dPTExfmkFIRuRU9E9Fpg2BBw5Jm26vdv2yREJSXKekS', 'pegawai', NULL, NULL, NULL, 'device_005', '2026-01-15 01:29:42'),
(9, 'riska@itb.ac.id', '$2y$10$ghBDG.IOG/dPTExfmkFIRuRU9E9Fpg2BBw5Jm26vdv2yREJSXKekS', 'pegawai', NULL, NULL, NULL, NULL, '2026-01-22 02:26:42'),
(10, 'admin@itb.ac.id', '$2a$10$aQi1P4jBnkDDAlozVBlyvuahJOA8dvDMcjTtCLKpFIJro3EKm4sha', 'admin', 'Riska Dwi Ramadani ', 'uploads/admin/admin-1770902307358-417074526.jpeg', '083176266583', NULL, '2025-01-15 01:00:00'),
(12, 'riskadwiramadani94@gmail.com', '$2y$10$ghBDG.IOG/dPTExfmkFIRuRU9E9Fpg2BBw5Jm26vdv2yREJSXKekS', 'pegawai', NULL, NULL, NULL, NULL, '2026-01-19 03:46:32'),
(13, 'cindy@itb.ac.id', '$2a$10$YpT5K4qo6mWzTlSZb5SS2uLhsXB6gFV2IgBzXtkGw14XYnd293R0O', 'pegawai', NULL, NULL, NULL, NULL, '2026-02-04 02:39:32'),
(14, 'fauziah@itb.ac.id', '$2a$10$tDcOTzrAHRpjnHVKD3hDu.gpaZxv5dAl.old3W4tBpS1qbueXl6y2', 'pegawai', NULL, NULL, NULL, NULL, '2026-02-15 11:41:14'),
(15, 'razka@itb.ac.id', '$2a$10$z41HrrW1NoReZjKMTDJbXuuZj9qYG6oXlEeA9eG4rY1HenyCKTPTG', 'pegawai', NULL, NULL, NULL, NULL, '2026-02-18 12:40:37');

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
  ADD KEY `fk_user_presensi` (`id_user`),
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `dinas`
--
ALTER TABLE `dinas`
  MODIFY `id_dinas` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `dinas_lokasi`
--
ALTER TABLE `dinas_lokasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `dinas_pegawai`
--
ALTER TABLE `dinas_pegawai`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `hari_libur`
--
ALTER TABLE `hari_libur`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `jam_kerja_hari`
--
ALTER TABLE `jam_kerja_hari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=316;

--
-- AUTO_INCREMENT for table `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `lokasi_realtime`
--
ALTER TABLE `lokasi_realtime`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `pegawai`
--
ALTER TABLE `pegawai`
  MODIFY `id_pegawai` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
  MODIFY `id_presensi` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
