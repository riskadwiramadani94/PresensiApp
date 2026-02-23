const express = require('express');
const router = express.Router();
const lemburController = require('../controllers/lemburController');

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
