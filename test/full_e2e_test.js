require('dotenv').config();
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000/api';
const timestamp = Date.now();
const instructorEmail = `e2e_instructor_${timestamp}@test.local`;
const studentEmail = `e2e_student_${timestamp}@test.local`;

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

async function loginUser(email, password) {
  return await fetchJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

async function run() {
  console.log('Starting full e2e test...');
  try {
    // Register instructor
    const r1 = await registerUser('E2E Instructor', instructorEmail, 'Password123!', 'instructor');
    const instructorToken = r1.token;
    console.log('Instructor registered');

    // Register student
    const r2 = await registerUser('E2E Student', studentEmail, 'Password123!', 'student');
    const studentToken = r2.token;
    console.log('Student registered');

    // Instructor creates two courses (include videoUrl and pdfUrl to allow percent calc)
    const c1 = await fetchJson('/courses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instructorToken}` }, body: JSON.stringify({ title: `E2E Course A ${timestamp}`, description: 'Course A', videoUrl: 'v1', pdfUrl: 'p1' }) });
    const courseA = c1.course;
    const c2 = await fetchJson('/courses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instructorToken}` }, body: JSON.stringify({ title: `E2E Course B ${timestamp}`, description: 'Course B', videoUrl: 'v2', pdfUrl: 'p2' }) });
    const courseB = c2.course;
    console.log('Created courses:', courseA._id, courseB._id);

    // Get all courses
    const all = await fetchJson('/courses', { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('All courses count:', all.count || (all.courses && all.courses.length));

    // Get my courses (instructor)
    const my = await fetchJson('/courses/my-courses', { headers: { Authorization: `Bearer ${instructorToken}` } });
    console.log('Instructor my-courses count:', my.count);

    // Update courseA
    await fetchJson(`/courses/${courseA._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instructorToken}` }, body: JSON.stringify({ title: `E2E Course A Updated ${timestamp}` }) });
    console.log('Updated courseA');

    // Student should be blocked from creating a course
    let studentCreateFailed = false;
    try {
      await fetchJson('/courses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ title: 'Bad', description: 'Should fail' }) });
    } catch (e) {
      studentCreateFailed = true;
      console.log('Student create blocked as expected');
    }

    // Delete courseB
    await fetchJson(`/courses/${courseB._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${instructorToken}` } });
    console.log('Deleted courseB');

    // Enrollment: student enroll in courseA
    await fetchJson(`/enroll/${courseA._id}`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Student enrolled in courseA');

    // Duplicate enrollment should fail
    try {
      await fetchJson(`/enroll/${courseA._id}`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` } });
      console.error('Duplicate enrollment did not fail');
    } catch (e) {
      console.log('Duplicate enrollment correctly failed');
    }

    // Get my enrollments
    const enrollList = await fetchJson('/enroll/my-courses', { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Enrollments count:', enrollList.count);

    // Progress: mark video complete
    const prog1 = await fetchJson('/progress/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ courseId: courseA._id, videoId: 'v1' }) });
    console.log('Marked video, percent:', prog1.progress.percentComplete);

    // Mark pdf complete
    const prog2 = await fetchJson('/progress/mark', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` }, body: JSON.stringify({ courseId: courseA._id, pdfId: 'p1' }) });
    console.log('Marked pdf, percent:', prog2.progress.percentComplete);

    // Get course progress
    const cp = await fetchJson(`/progress/${courseA._id}`, { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Course progress percent:', cp.progress.percentComplete);

    // Get my progress
    const mp = await fetchJson('/progress/my', { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('My progress count:', mp.count);

    // Unenroll
    await fetchJson(`/enroll/${courseA._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Student unenrolled');

    console.log('\nE2E API tests completed successfully');
  } catch (err) {
    console.error('E2E test error:', err.data || err.message);
  } finally {
    // cleanup via mongoose
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const User = require('../models/User');
      const Course = require('../models/Course');
      const Enrollment = require('../models/Enrollment');
      const Progress = require('../models/Progress');

      await Progress.deleteMany({});
      await Enrollment.deleteMany({});
      await Course.deleteMany({ title: { $regex: /^E2E Course / } });
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
