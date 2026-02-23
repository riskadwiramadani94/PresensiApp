const express = require('express');
const router = express.Router();
const kegiatanController = require('../controllers/kegiatanController-pegawai');

// Get kegiatan dinas untuk pegawai
router.get('/api/kegiatan', kegiatanController.getKegiatanPegawai);

// Get detail kegiatan dinas
router.get('/api/kegiatan/:id', kegiatanController.getDetailKegiatan);

module.exports = router;
