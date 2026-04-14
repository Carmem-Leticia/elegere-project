const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController'); 

router.post('/', categoryController.create);      
router.get('/', categoryController.listAll);    
router.put('/:id', categoryController.update);    
router.delete('/:id', categoryController.delete); 

module.exports = router;