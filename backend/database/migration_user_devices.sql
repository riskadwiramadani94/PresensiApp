-- Migration: Tambah tabel user_devices untuk push notification
-- Tanpa perlu tabel notifications!

CREATE TABLE IF NOT EXISTS user_devices (
  id_device INT PRIMARY KEY AUTO_INCREMENT,
  id_user INT NOT NULL,
  push_token VARCHAR(255) NOT NULL,
  device_type ENUM('android', 'ios') NOT NULL,
  device_name VARCHAR(100) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE,
  UNIQUE KEY unique_token (push_token),
  INDEX idx_user_active (id_user, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Catatan: Tabel ini hanya untuk simpan push token device
-- Notifikasi TIDAK disimpan di database, langsung dikirim ke device!
