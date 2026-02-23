const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getPresensi, submitPresensi, checkDinasStatus, getRiwayatGabungan, checkDinasAttendance, getAllPresensiToday, getAllPresensi } = require('../controllers/presensiController');
const { detectNearestOffice } = require('../controllers/locationDetectController');

// Setup multer untuk upload foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/presensi/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'presensi-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/presensi', getPresensi);
router.post('/presensi', upload.single('foto'), submitPresensi);
router.get('/detect-location', detectNearestOffice);
router.get('/check-dinas-status', checkDinasStatus);
router.get('/check-dinas-attendance', checkDinasAttendance);
router.get('/riwayat-gabungan', getRiwayatGabungan);
router.get('/all-presensi-today', getAllPresensiToday);
router.get('/all-presensi', getAllPresensi); // Admin endpoint - all history

module.exports = router;