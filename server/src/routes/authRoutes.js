const express = require('express');
const { register, login, getProfile, getSolvedProblems } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Basic rate limiting middleware (simple implementation)
const createRateLimiter = () => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 10;

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const userRequests = requests.get(ip);
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }

    recentRequests.push(now);
    requests.set(ip, recentRequests);
    next();
  };
};

const rateLimiter = createRateLimiter();

// Auth routes
router.post('/register', rateLimiter, register);
router.post('/login', rateLimiter, login);
router.get('/profile', authMiddleware, getProfile);
router.get('/:userId/solved-problems', authMiddleware, getSolvedProblems);
module.exports = router;
