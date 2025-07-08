const express = require('express');
const { getContestLeaderboard, getUserLeaderboardPosition } = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Get contest leaderboard
router.get('/contests/:contestSlug/leaderboard', authMiddleware, getContestLeaderboard);

// Get user's position in leaderboard (requires authentication)
router.get('/contests/:contestSlug/leaderboard/me', authMiddleware, getUserLeaderboardPosition);

module.exports = router;
