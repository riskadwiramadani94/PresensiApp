const express = require('express');
const router = express.Router();
const { getPengajuan, submitPengajuan, getIzinHariIni, deletePengajuan } = require('../controllers/pengajuanController');

router.get('/pengajuan', getPengajuan);
router.post('/pengajuan', submitPengajuan);
router.get('/pengajuan/izin-hari-ini', getIzinHariIni);
router.delete('/pengajuan/:id', deletePengajuan);

module.exports = router;