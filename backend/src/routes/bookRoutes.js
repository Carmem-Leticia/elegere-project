const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.post('/', bookController.create);
router.get('/', bookController.listAll);
router.put('/:id', bookController.update);
router.delete('/:id', bookController.delete);

module.exports = router;