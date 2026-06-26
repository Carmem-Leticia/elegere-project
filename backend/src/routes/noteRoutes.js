const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const verifyToken = require('../middlewares/authMiddleware'); // ← middlewares com S

router.use(verifyToken);

router.post('/', noteController.create);
router.get('/', noteController.listAllMine);
router.get('/book/:bookId', noteController.listByBook);
router.put('/:id', noteController.update);
router.delete('/:id', noteController.delete);

module.exports = router;