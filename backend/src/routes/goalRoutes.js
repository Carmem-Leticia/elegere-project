const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const verifyToken = require('../middlewares/authMiddleware');

router.post('/',    verifyToken, goalController.create);
router.get('/',     verifyToken, goalController.getMyGoal);
router.put('/:id',  verifyToken, goalController.update);
router.delete('/:id', verifyToken, goalController.delete);

module.exports = router;