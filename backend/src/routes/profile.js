const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, upload, changePassword } = require('../controllers/profileController');

router.get('/profile', getProfile);
router.put('/profile', upload.single('foto_profil'), updateProfile);
router.post('/change-password', changePassword);

module.exports = router;