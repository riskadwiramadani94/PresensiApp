const express = require('express');
const router = express.Router();
const { getLaporan, getDetailAbsenPegawai, getDetailLaporan, getDetailAbsen, exportPDF, exportLaporan, exportPegawai } = require('../controllers/laporanController-admin');

router.get('/laporan', getLaporan);
router.get('/detail-absen-pegawai/:id', getDetailAbsenPegawai);
router.get('/detail-laporan', getDetailLaporan);
router.get('/detail-absen', getDetailAbsen);
router.get('/export-pdf', exportPDF);
router.get('/export-laporan', exportLaporan);
router.get('/export-pegawai', exportPegawai);

module.exports = router;