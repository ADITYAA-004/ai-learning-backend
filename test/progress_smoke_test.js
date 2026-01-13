require('dotenv').config();
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000/api';
const timestamp = Date.now();
const instructorEmail = `prog_instructor_${timestamp}@test.local`;
const studentEmail = `prog_student_${timestamp}@test.local`;

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error('Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function registerUser(name, email, password, role) {
  return await fetchJson('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
}

async function createCourse(token) {
  return await fetchJson('/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: `Prog Test Course ${timestamp}`, description: 'Progress smoke test', videoUrl: 'v1', pdfUrl: 'p1' }),
  }).then(d => d.course);
}

async function run() {
  console.log('Starting progress smoke test...');
  try {
    let r = await registerUser('Prog Instructor', instructorEmail, 'Password123!', 'instructor');
    const instructorToken = r.token;

    const course = await createCourse(instructorToken);
    const courseId = course._id;

    r = await registerUser('Prog Student', studentEmail, 'Password123!', 'student');
    const studentToken = r.token;

    // Enroll student
    await fetchJson(`/enroll/${courseId}`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` } });

    // Mark video complete
    let prog = await fetchJson('/progress/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ courseId, videoId: 'v1' }) });
    console.log('Marked video:', prog.progress.percentComplete);

    // Mark pdf complete
    prog = await fetchJson('/progress/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ courseId, pdfId: 'p1' }) });
    console.log('Marked pdf:', prog.progress.percentComplete);

    // Get course progress
    const cp = await fetchJson(`/progress/${courseId}`, { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Course progress percent:', cp.progress.percentComplete);

    // Get my progress
    const mp = await fetchJson('/progress/my', { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('My progress count:', mp.count);

    console.log('Progress smoke test completed');
  } catch (err) {
    console.error('Progress test error:', err.data || err.message);
  } finally {
    // cleanup
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const User = require('../models/user');
      const Course = require('../models/Course');
      const Enrollment = require('../models/Enrollment');
      const Progress = require('../models/Progress');

      await Progress.deleteMany({});
      await Enrollment.deleteMany({});
      await Course.deleteMany({ title: { $regex: /^Prog Test Course / } });
      await User.deleteMany({ email: { $in: [instructorEmail, studentEmail] } });
      console.log('Cleanup complete');
    } catch (e) {
      console.error('Cleanup error:', e.message);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  }
}

run();
