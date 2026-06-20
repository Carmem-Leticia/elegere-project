const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/search', libraryController.searchGutenberg);

router.get('/read/:gutenberg_id', libraryController.readBook);

router.get('/dictionary/:word', verifyToken, libraryController.lookupWord);

router.post('/import', verifyToken, libraryController.importToLocal);

module.exports = router;