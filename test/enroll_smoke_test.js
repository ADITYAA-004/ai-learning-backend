require('dotenv').config();
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000/api';

const timestamp = Date.now();
const instructorEmail = `test_instructor_${timestamp}@test.local`;
const studentEmail = `test_student_${timestamp}@test.local`;
let instructorToken, studentToken, courseId, instructorId, studentId;

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
    body: JSON.stringify({ title: `Test Course ${timestamp}`, description: 'Smoke test course' }),
  }).then(d => d.course);
}

async function run() {
  console.log('Starting enrollment smoke test...');

  try {
    // Register instructor
    let r = await registerUser('Test Instructor', instructorEmail, 'Password123!', 'instructor');
    instructorToken = r.token; instructorId = r.user.id;
    console.log('Instructor registered');

    // Create course
    const course = await createCourse(instructorToken);
    courseId = course._id;
    console.log('Course created:', courseId);

    // Register student
    r = await registerUser('Test Student', studentEmail, 'Password123!', 'student');
    studentToken = r.token; studentId = r.user.id;
    console.log('Student registered');

    // Enroll student
    let enrollRes = await fetchJson(`/enroll/${courseId}`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Enroll response:', enrollRes.message || enrollRes);

    // Try duplicate enroll (should fail)
    try {
      await fetchJson(`/enroll/${courseId}`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` } });
      console.error('Duplicate enroll did NOT fail as expected');
    } catch (dupErr) {
      console.log('Duplicate enroll correctly failed:', dupErr.data && dupErr.data.message);
    }

    // Get enrollments
    const myCourses = await fetchJson('/enroll/my-courses', { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('My enrollments count:', myCourses.count);

    // Unenroll
    const unen = await fetchJson(`/enroll/${courseId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${studentToken}` } });
    console.log('Unenroll response:', unen.message || unen);

    console.log('Smoke test completed successfully');
  } catch (error) {
    console.error('Smoke test error:', error.response ? error.response.data : error.message);
  } finally {
    // Cleanup: remove test users, course, enrollments directly from DB
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const User = require('../models/user');
      const Course = require('../models/Course');
      const Enrollment = require('../models/Enrollment');

      await Enrollment.deleteMany({});
      await Course.deleteMany({ title: `Test Course ${timestamp}` });
      await User.deleteMany({ email: { $in: [instructorEmail, studentEmail] } });

      console.log('Cleanup complete');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    } finally {
      mongoose.disconnect();
      process.exit(0);
    }
  }
}

run();
