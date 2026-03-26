-- Migration: Add user_device table for push notifications
-- Created: 2025-03-25

CREATE TABLE IF NOT EXISTS `user_device` (
  `id_device` INT AUTO_INCREMENT PRIMARY KEY,
  `id_user` INT NOT NULL,
  `push_token` VARCHAR(255) NOT NULL,
  `device_type` ENUM('android', 'ios', 'web') DEFAULT 'android',
  `device_name` VARCHAR(100) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_token` (`id_user`, `push_token`),
  FOREIGN KEY (`id_user`) REFERENCES `users`(`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index untuk performa query
CREATE INDEX `idx_user_device_user` ON `user_device`(`id_user`);
CREATE INDEX `idx_user_device_active` ON `user_device`(`is_active`);
