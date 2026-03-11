const express = require('express');
const router = express.Router();
const { 
  uploadSPT,
  getDinasAktifAdmin, 
  createDinasAdmin,
  updateDinas,
  deleteDinas,
  cancelDinas,
  getRiwayatDinasAdmin, 
  getValidasiAbsenAdmin,
  getDinasStats,
  getDinasLokasi,
  checkAbsenLocation,
  validateAbsenDinas
} = require('../controllers/dinasController-admin');
const { getJamKerjaDinas } = require('../controllers/jamKerjaDinasController');

router.get('/dinas-aktif', getDinasAktifAdmin);
router.post('/create-dinas', uploadSPT, createDinasAdmin);
router.put('/update-dinas/:id', uploadSPT, updateDinas);
router.delete('/delete-dinas/:id', deleteDinas);
router.put('/delete-dinas/:id/cancel', cancelDinas);
router.get('/riwayat-dinas', getRiwayatDinasAdmin);
router.get('/validasi-absen', getValidasiAbsenAdmin);
router.get('/stats', getDinasStats);
router.get('/dinas/:id_dinas/lokasi', getDinasLokasi);
router.get('/jam-kerja', getJamKerjaDinas);
router.post('/check-location', checkAbsenLocation);
router.post('/validate-absen/:id', validateAbsenDinas);

module.exports = router;