const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController'); 

const verifyToken = require('../middlewares/authMiddleware'); 

router.post('/', verifyToken, reviewController.create);      
router.get('/book/:bookId', reviewController.getByBook); 
router.put('/:id', verifyToken, reviewController.update);    
router.delete('/:id', verifyToken, reviewController.delete); 

module.exports = router;