-- Script minimal untuk rename FK field yang ada

-- 1. Update foreign key di absen_lembur untuk lokasi_id -> id_lokasi_kantor
ALTER TABLE `absen_lembur` DROP FOREIGN KEY `fk_absen_lembur_lokasi`;
ALTER TABLE `absen_lembur` DROP INDEX `fk_absen_lembur_lokasi`;
ALTER TABLE `absen_lembur` CHANGE `lokasi_id` `id_lokasi_kantor` int(11) DEFAULT NULL COMMENT 'ID lokasi kantor';
ALTER TABLE `absen_lembur` ADD KEY `fk_absen_lembur_lokasi_kantor` (`id_lokasi_kantor`);
ALTER TABLE `absen_lembur` ADD CONSTRAINT `fk_absen_lembur_lokasi_kantor` FOREIGN KEY (`id_lokasi_kantor`) REFERENCES `lokasi_kantor` (`id_lokasi_kantor`) ON DELETE SET NULL;

-- 2. Update foreign key di presensi untuk lokasi_id -> id_lokasi_kantor
ALTER TABLE `presensi` DROP FOREIGN KEY `fk_presensi_lokasi`;
ALTER TABLE `presensi` DROP INDEX `fk_presensi_lokasi`;
ALTER TABLE `presensi` CHANGE `lokasi_id` `id_lokasi_kantor` int(11) DEFAULT NULL COMMENT 'ID lokasi tempat absen';
ALTER TABLE `presensi` ADD KEY `fk_presensi_lokasi_kantor` (`id_lokasi_kantor`);
ALTER TABLE `presensi` ADD CONSTRAINT `fk_presensi_lokasi_kantor` FOREIGN KEY (`id_lokasi_kantor`) REFERENCES `lokasi_kantor` (`id_lokasi_kantor`) ON DELETE SET NULL;

-- 3. Update foreign key di presensi untuk dinas_id -> id_dinas
ALTER TABLE `presensi` DROP FOREIGN KEY `fk_presensi_dinas`;
ALTER TABLE `presensi` DROP INDEX `fk_presensi_dinas`;
ALTER TABLE `presensi` CHANGE `dinas_id` `id_dinas` int(11) DEFAULT NULL COMMENT 'ID dinas jika absen dinas';
ALTER TABLE `presensi` ADD KEY `fk_presensi_dinas` (`id_dinas`);
ALTER TABLE `presensi` ADD CONSTRAINT `fk_presensi_dinas` FOREIGN KEY (`id_dinas`) REFERENCES `dinas` (`id_dinas`) ON DELETE SET NULL;