const express = require('express');
const router = express.Router();
const { kirimOTP, verifikasiOTP, resetPassword } = require('../controllers/lupaPasswordController');

// POST /api/lupa-password/kirim-otp
router.post('/kirim-otp', kirimOTP);

// POST /api/lupa-password/verifikasi-otp  
router.post('/verifikasi-otp', verifikasiOTP);

// POST /api/lupa-password/reset-password
router.post('/reset-password', resetPassword);

module.exports = router;