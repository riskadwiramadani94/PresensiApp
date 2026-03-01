const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');

router.get('/', faqController.getAllFAQ);
router.get('/search', faqController.searchFAQ);

module.exports = router;
