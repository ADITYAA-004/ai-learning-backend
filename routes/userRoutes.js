const express = require('express');
const router = express.Router();
const { getMe } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

// GET /api/users/me - Get current user (alias for /api/auth/me)
router.get('/me', protect, getMe);

module.exports = router;

