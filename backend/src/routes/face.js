const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { enrollFace, verifyFace, getFaceStatus, validateFaceOnly } = require('../controllers/faceController');

// Pastikan folder uploads/face ada
const faceUploadDir = path.join(__dirname, '../../uploads/face');
if (!fs.existsSync(faceUploadDir)) {
  fs.mkdirSync(faceUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, faceUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'face-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/enroll', upload.single('foto'), enrollFace);
router.post('/verify', upload.single('foto'), verifyFace);
router.post('/validate', upload.single('foto'), validateFaceOnly);
router.get('/status', getFaceStatus);

module.exports = router;
