const express = require('express');
const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  createCourse,
  getAllCourses,
  getCourseById,
  getMyCourses,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');

// Order matters: /my-courses should come before /:id
router.get('/my-courses', protect, protect.authorize('instructor'), getMyCourses);
router.get('/', protect, getAllCourses);
router.get('/:id', protect, getCourseById);
router.post('/', protect, protect.authorize('instructor'), createCourse);
router.put('/:id', protect, protect.authorize('instructor'), updateCourse);
router.delete('/:id', protect, protect.authorize('instructor'), deleteCourse);

module.exports = router;
