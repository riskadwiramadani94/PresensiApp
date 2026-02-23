const express = require('express');
const router = express.Router();
const performaController = require('../controllers/performaController-pegawai');

// Get performa pegawai
router.get('/performa', performaController.getPerforma);

module.exports = router;
