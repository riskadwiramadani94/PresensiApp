const express = require('express');
const router = express.Router();
const pusatValidasiController = require('../controllers/pusatValidasiController');

// Get data untuk setiap tab
router.get('/absen-dinas', pusatValidasiController.getAbsenDinas);
router.get('/absen-dinas/all', pusatValidasiController.getAllAbsenDinas);
router.get('/pengajuan', pusatValidasiController.getPengajuan);
router.get('/pengajuan/all', pusatValidasiController.getAllPengajuan);
router.get('/statistik', pusatValidasiController.getStatistik);

// Actions
router.post('/setujui', pusatValidasiController.setujui);
router.post('/tolak', pusatValidasiController.tolak);

module.exports = router;