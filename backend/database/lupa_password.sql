CREATE TABLE IF NOT EXISTS lupa_password (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    kode_otp VARCHAR(6) NOT NULL,
    waktu_expired DATETIME NOT NULL,
    sudah_digunakan TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_otp (kode_otp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
