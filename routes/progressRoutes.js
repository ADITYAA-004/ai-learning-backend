const express = require('express');
const router = express.Router();

const protect = require('../middleware/authMiddleware');
const {
  markLessonComplete,
  getMyProgress,
  getCourseProgress,
} = require('../controllers/progressController');

router.post('/mark', protect, protect.authorize('student'), markLessonComplete);
router.get('/my', protect, protect.authorize('student'), getMyProgress);
router.get('/:courseId', protect, protect.authorize('student'), getCourseProgress);

module.exports = router;
