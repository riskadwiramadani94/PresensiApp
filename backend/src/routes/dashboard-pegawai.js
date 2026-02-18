const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController-pegawai');

router.get('/api/dashboard', getDashboard);

module.exports = router;
