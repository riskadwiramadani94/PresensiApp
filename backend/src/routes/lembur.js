const express = require('express');
const router = express.Router();
const lemburController = require('../controllers/lemburController');

// Get lokasi terdekat dari posisi user
router.post('/lokasi-terdekat', lemburController.getLokasiTerdekat);

// Get detail lembur berdasarkan ID pengajuan
router.get('/detail', lemburController.getDetailLembur);

// Get absen lembur berdasarkan tanggal
router.get('/absen-tanggal', lemburController.getAbsenLemburByTanggal);

// Get pengajuan lembur hari ini yang disetujui
router.get('/pengajuan-hari-ini', lemburController.getPengajuanLemburHariIni);

// Get lokasi untuk absen lembur
router.get('/lokasi', lemburController.getLokasiLembur);

// Get list absen lembur aktif
router.get('/absen-aktif', lemburController.getAbsenLemburAktif);

// Get riwayat lembur
router.get('/riwayat', lemburController.getRiwayatLembur);

// Absen masuk lembur
router.post('/absen-masuk', lemburController.absenMasukLembur);

// Absen pulang lembur
router.post('/absen-pulang', lemburController.absenPulangLembur);

module.exports = router;
