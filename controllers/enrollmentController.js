const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Enroll a student in a course
exports.enrollInCourse = async (req, res) => {
  try {
    // Double-check role just in case
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can enroll' });
    }

    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const existing = await Enrollment.findOne({ user: req.user._id, course: course._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already enrolled in this course' });
    }

    let enrollment = await Enrollment.create({ user: req.user._id, course: course._id });

    // Populate course title and instructor name
    enrollment = await enrollment
      .populate({ path: 'course', select: 'title', populate: { path: 'instructor', select: 'name' } });

    return res.status(201).json({ success: true, message: 'Enrolled successfully', enrollment });
  } catch (error) {
    console.error('enrollInCourse Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate enrollment' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get current user's enrollments
exports.getMyEnrollments = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate({ path: 'course', select: 'title description thumbnail instructor', populate: { path: 'instructor', select: 'name' } })
      .sort({ enrolledAt: -1 });

    return res.status(200).json({ success: true, count: enrollments.length, enrollments });
  } catch (error) {
    console.error('getMyEnrollments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Unenroll a student from a course
exports.unenrollCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can unenroll' });
    }

    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    await Enrollment.deleteOne({ _id: enrollment._id });

    return res.status(200).json({ success: true, message: 'Unenrolled successfully' });
  } catch (error) {
    console.error('unenrollCourse Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
