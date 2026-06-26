const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/tags',            verifyToken, aiController.listTags);
router.get('/preferences',     verifyToken, aiController.getPreferences);
router.post('/preferences',    verifyToken, aiController.savePreferences);
router.get('/recommendations', verifyToken, aiController.getRecommendations);
router.post('/ask',            verifyToken, aiController.askAboutBook);

module.exports = router;