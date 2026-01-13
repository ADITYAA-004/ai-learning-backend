const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Helper to compute percent complete
const computePercent = (completedVideos, completedPDFs, course) => {
  let total = 0;
  // Support multiple course shapes: arrays `videos`/`pdfs` or single `videoUrl`/`pdfUrl`
  if (Array.isArray(course.videos)) total += course.videos.length;
  else if (course.videoUrl) total += 1;

  if (Array.isArray(course.pdfs)) total += course.pdfs.length;
  else if (course.pdfUrl) total += 1;

  // Prevent division by zero: if course has no declared lessons, consider total = completed count
  if (total === 0) total = completedVideos.length + completedPDFs.length || 1;

  const completed = (completedVideos ? completedVideos.length : 0) + (completedPDFs ? completedPDFs.length : 0);
  return Math.min(100, Math.round((completed / total) * 100));
};

// POST /api/progress/mark
exports.markLessonComplete = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can mark progress' });
    }

    const { courseId, videoId, pdfId } = req.body;

    if (!courseId || (!videoId && !pdfId)) {
      return res.status(400).json({ success: false, message: 'courseId and videoId or pdfId required' });
    }

    // Ensure course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Ensure user is enrolled in the course
    const enrolled = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (!enrolled) return res.status(403).json({ success: false, message: 'User not enrolled in course' });

    // Find or create progress doc
    let progress = await Progress.findOne({ user: req.user._id, course: courseId });
    if (!progress) {
      progress = await Progress.create({ user: req.user._id, course: courseId });
    }

    let changed = false;
    if (videoId) {
      if (!progress.completedVideos.includes(videoId)) {
        progress.completedVideos.push(videoId);
        changed = true;
      }
    }

    if (pdfId) {
      if (!progress.completedPDFs.includes(pdfId)) {
        progress.completedPDFs.push(pdfId);
        changed = true;
      }
    }

    if (changed) {
      progress.percentComplete = computePercent(progress.completedVideos, progress.completedPDFs, course);
      progress.lastAccessed = Date.now();
      await progress.save();
    } else {
      // update lastAccessed regardless
      progress.lastAccessed = Date.now();
      await progress.save();
    }

    const populated = await progress.populate({ path: 'course', select: 'title thumbnail' });
    return res.status(200).json({ success: true, progress: populated });
  } catch (error) {
    console.error('markLessonComplete Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/progress/my
exports.getMyProgress = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can view progress' });
    }

    const progresses = await Progress.find({ user: req.user._id }).populate('course', 'title thumbnail').sort({ lastAccessed: -1 });
    return res.status(200).json({ success: true, count: progresses.length, progresses });
  } catch (error) {
    console.error('getMyProgress Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/progress/:courseId
exports.getCourseProgress = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can view progress' });
    }

    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId required' });

    const progress = await Progress.findOne({ user: req.user._id, course: courseId }).populate('course', 'title thumbnail');
    if (!progress) return res.status(404).json({ success: false, message: 'Progress not found for this course' });

    return res.status(200).json({ success: true, progress });
  } catch (error) {
    console.error('getCourseProgress Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
