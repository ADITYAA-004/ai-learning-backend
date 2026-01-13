require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('../models/User');
    const Course = require('../models/Course');
    const Enrollment = require('../models/Enrollment');

    const ures = await User.deleteMany({ email: { $regex: /^test_(instructor|student)_/ } });
    const cres = await Course.deleteMany({ title: { $regex: /^Test Course / } });
    const eres = await Enrollment.deleteMany({});

    console.log('Cleanup results:', { usersDeleted: ures.deletedCount, coursesDeleted: cres.deletedCount, enrollmentsDeleted: eres.deletedCount });
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanup();
