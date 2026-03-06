-- Migration untuk fitur lupa password
-- Tabel untuk menyimpan kode OTP reset password

CREATE TABLE `lupa_password` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `kode_otp` varchar(6) NOT NULL,
  `waktu_expired` timestamp NOT NULL,
  `sudah_digunakan` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_kode_otp` (`kode_otp`),
  KEY `idx_waktu_expired` (`waktu_expired`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tambah index untuk performa
ALTER TABLE `lupa_password` 
ADD INDEX `idx_email_kode` (`email`, `kode_otp`);

-- Tambah constraint foreign key ke tabel users
ALTER TABLE `lupa_password` 
ADD CONSTRAINT `fk_lupa_password_email` 
FOREIGN KEY (`email`) REFERENCES `users` (`email`) 
ON DELETE CASCADE ON UPDATE CASCADE;