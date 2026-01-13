const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/signup', register); // Alias for register
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe); // Alias for getMe

module.exports = router;
