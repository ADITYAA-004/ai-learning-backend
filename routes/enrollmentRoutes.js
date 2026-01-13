const express = require('express');
const router = express.Router();

const protect = require('../middleware/authMiddleware');
const {
  enrollInCourse,
  getMyEnrollments,
  unenrollCourse,
} = require('../controllers/enrollmentController');

// POST   /:courseId   -> enroll
router.post('/:courseId', protect, protect.authorize('student'), enrollInCourse);

// GET    /my-courses  -> list user's enrollments
router.get('/my-courses', protect, protect.authorize('student'), getMyEnrollments);

// DELETE /:courseId   -> unenroll
router.delete('/:courseId', protect, protect.authorize('student'), unenrollCourse);

module.exports = router;
