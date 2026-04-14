const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const verifyToken = require('../middlewares/authMiddleware'); 

router.post('/', verifyToken, progressController.startReading);
router.get('/', verifyToken, progressController.getMyLibrary);
router.put('/:book_id', verifyToken, progressController.updateProgress);
router.delete('/:book_id', verifyToken, progressController.removeBook);

module.exports = router;