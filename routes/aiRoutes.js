const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

router.post('/ask', protect, aiController.ask);
router.get('/history/:courseId', protect, aiController.history);
router.post('/cache/clear', protect, protect.authorize('instructor'), aiController.clearCache);

module.exports = router;
