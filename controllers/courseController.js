const Course = require('../models/Course');

// Create a course (instructor only)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, pdfUrl = '', videoUrl = '', thumbnail } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const course = await Course.create({
      title,
      description,
      pdfUrl,
      videoUrl,
      thumbnail: thumbnail || undefined,
      instructor: req.user.id
    });

    await course.populate('instructor', 'name email role');

    return res.status(201).json({ success: true, message: 'Course created successfully', course });
  } catch (error) {
    console.error('courseController.createCourse Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all courses (authenticated users)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name email').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: courses.length, courses });
  } catch (error) {
    console.error('courseController.getAllCourses Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get course by ID (authenticated users)
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name email role');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({ success: true, course });
  } catch (error) {
    console.error('courseController.getCourseById Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get my courses (instructor only)
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).populate('instructor', 'name email').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: courses.length, courses });
  } catch (error) {
    console.error('courseController.getMyCourses Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update course (only course creator)
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('instructor', 'name email');

    return res.status(200).json({ success: true, message: 'Course updated successfully', course: updated });
  } catch (error) {
    console.error('courseController.updateCourse Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete course (only course creator)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this course' });
    }

    await course.deleteOne();

    return res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('courseController.deleteCourse Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
