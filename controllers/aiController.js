const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const User = require('../models/user');
const { askLLM } = require('../services/aiService');
const AIChat = require('../models/AIChat');
const PDFText = require('../models/PDFText');

// POST /api/ai/ask
async function ask(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

    // Only students allowed
    if (user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can use the AI tutor' });
    }

    const { courseId, question } = req.body || {};
    if (!courseId || !question) return res.status(400).json({ success: false, message: 'courseId and question are required' });

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const enrollment = await Enrollment.findOne({ user: user._id, course: courseId });
    if (!enrollment) return res.status(403).json({ success: false, message: 'You must be enrolled to use the AI tutor' });

    const progress = await Progress.findOne({ user: user._id, course: courseId }).lean();

    // Call AI service
    const out = await askLLM({ user, course, progress, question });

    // Persist chat: create or append to AIChat document for this user+course
    try {
      const update = {
        $push: {
          messages: { role: 'user', text: question, createdAt: new Date() },
        },
      };
      await AIChat.findOneAndUpdate({ user: user._id, course: courseId }, update, { upsert: true, new: true });
      // append assistant reply
      await AIChat.findOneAndUpdate({ user: user._id, course: courseId }, { $push: { messages: { role: 'assistant', text: out.answer || '', createdAt: new Date() } } }, { new: true });
    } catch (e) {
      console.error('Failed to persist chat', e.message || e);
    }

    return res.json({ success: true, answer: out.answer, recommendation: out.recommendation, confidence: out.confidence });
  } catch (err) {
    console.error('AI ask error', err);
    return res.status(500).json({ success: false, message: err.message || 'AI error' });
  }
}

module.exports = { ask };

// GET /api/ai/history/:courseId
async function history(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

    const { courseId } = req.params || {};
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId required' });

    // Only students may fetch their history
    if (user.role !== 'student') return res.status(403).json({ success: false, message: 'Only students can access chat history' });

    const chat = await AIChat.findOne({ user: user._id, course: courseId }).lean();
    if (!chat) return res.json({ success: true, messages: [] });

    return res.json({ success: true, messages: chat.messages || [] });
  } catch (err) {
    console.error('AI history error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

module.exports.history = history;

// POST /api/ai/cache/clear
async function clearCache(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

    // only instructors may clear cache
    if (user.role !== 'instructor') return res.status(403).json({ success: false, message: 'Not authorized' });

    const { url, all } = req.body || {};
    if (!url && !all) return res.status(400).json({ success: false, message: 'url or all=true is required' });

    if (all) {
      const r = await PDFText.deleteMany({});
      return res.json({ success: true, deletedCount: r.deletedCount || 0 });
    }

    const r = await PDFText.findOneAndDelete({ url });
    return res.json({ success: true, deleted: !!r });
  } catch (err) {
    console.error('Cache clear error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

module.exports.clearCache = clearCache;
