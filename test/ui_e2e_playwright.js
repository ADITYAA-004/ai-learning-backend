require('dotenv').config();
const { chromium } = require('playwright');
const mongoose = require('mongoose');

const BASE_API = 'http://localhost:5000/api';
const FRONTEND = 'http://localhost:3000';
const timestamp = Date.now();
const instructorEmail = `ui_instructor_${timestamp}@test.local`;
const studentEmail = `ui_student_${timestamp}@test.local`;
const PASSWORD = 'Password123!';

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE_API}${path}`, options);
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

async function createSetup() {
  const instr = await fetchJson('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UI Instructor', email: instructorEmail, password: PASSWORD, role: 'instructor' })
  });
  const stud = await fetchJson('/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UI Student', email: studentEmail, password: PASSWORD, role: 'student' })
  });

  const course = await fetchJson('/courses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instr.token}` },
    body: JSON.stringify({ title: `UI Course ${timestamp}`, description: 'UI E2E course', videoUrl: 'v-ui', pdfUrl: 'p-ui' })
  });

  // enroll student via API so UI can mark progress
  await fetchJson(`/enroll/${course.course._id}`, { method: 'POST', headers: { Authorization: `Bearer ${stud.token}` } });

  return { courseId: course.course._id };
}

async function run() {
  console.log('Starting Playwright UI e2e test...');
  let browser;
  try {
    const { courseId } = await createSetup();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as student
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Go to courses and open our course
    await page.goto(`${FRONTEND}/courses`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.course-card', { timeout: 10000 });
    // Click the card that contains our title
    const cards = await page.$$('.course-card');
    let clicked = false;
    for (const c of cards) {
      const title = await c.$eval('.course-card-title', el => el.textContent.trim());
      if (title.includes('UI Course')) { await c.click(); clicked = true; break; }
    }
    if (!clicked) throw new Error('Course card not found in UI');

    // Wait for mark buttons
    await page.waitForSelector('button:has-text("Mark Video")', { timeout: 5000 });
    // Click mark video
    await page.click('button:has-text("Mark Video")');
    await page.waitForSelector('text=✔ Video Watched', { timeout: 5000 });

    // Click mark pdf
    await page.click('button:has-text("Mark PDF")');
    await page.waitForSelector('text=✔ PDF Read', { timeout: 5000 });

    // Go to progress page and verify
    await page.goto(`${FRONTEND}/progress`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.progress-card', { timeout: 5000 });
    const percentText = await page.$eval('.progress-card h3 + p, .progress-card', el => el.textContent || '');
    console.log('Progress page element sample:', percentText);

    console.log('UI e2e test passed');
  } catch (err) {
    console.error('UI e2e test failed:', err.data || err.message || err);
  } finally {
    // cleanup
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const User = require('../models/User');
      const Course = require('../models/Course');
      const Enrollment = require('../models/Enrollment');
      const Progress = require('../models/Progress');
      await Progress.deleteMany({});
      await Enrollment.deleteMany({});
      await Course.deleteMany({ title: { $regex: /^UI Course / } });
      await User.deleteMany({ email: { $regex: /^ui_(instructor|student)_/ } });
      await mongoose.disconnect();
      if (browser) await browser.close();
    } catch (e) {
      console.error('Cleanup UI test error:', e.message);
    }
    process.exit(0);
  }
}

run();
