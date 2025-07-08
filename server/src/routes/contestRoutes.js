const express = require('express');
const router = express.Router();
const {
  getAllContests,
  getContestBySlug,
  getContestProblemBySlug,
  getContestSubmissionStatus,
  getUserContestSubmissions
} = require('../controllers/contestController');

const { submitContestSolution } = require('../controllers/submissionController');

const authMiddleware = require('../middleware/authMiddleware');

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`Contest Route: ${req.method} ${req.path}`);
  console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
  next();
});

// Contest problem routes
router.get('/:contestSlug/problems/:problemSlug', authMiddleware, getContestProblemBySlug);
router.post('/:contestSlug/submissions/:problemSlug', authMiddleware, submitContestSolution);

// Contest general routes
router.get('/', getAllContests);
router.get('/:slug', authMiddleware, getContestBySlug);

// Submission status
router.get('/submissions/status/:submissionId', authMiddleware, getContestSubmissionStatus);

// Standalone problem route

// User contest submissions
router.get('/:contestSlug/problems/:problemSlug/submissions', authMiddleware, getUserContestSubmissions);

module.exports = router;
