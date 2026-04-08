const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middlewares/authMiddleware'); 

router.post('/', authMiddleware, progressController.startReading);
router.get('/', authMiddleware, progressController.getMyLibrary);
router.put('/:book_id', authMiddleware, progressController.updateProgress);
router.delete('/:book_id', authMiddleware, progressController.removeBook);

module.exports = router;