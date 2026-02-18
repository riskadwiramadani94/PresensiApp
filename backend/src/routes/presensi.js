const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getPresensi, submitPresensi, checkDinasStatus, getRiwayatGabungan, checkDinasAttendance } = require('../controllers/presensiController');

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
router.get('/check-dinas-status', checkDinasStatus);
router.get('/check-dinas-attendance', checkDinasAttendance);
router.get('/riwayat-gabungan', getRiwayatGabungan);

module.exports = router;