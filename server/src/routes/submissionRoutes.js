// routes/submissions.js
const express = require('express');
const router = express.Router();
const { submitSolution, getSubmissionStatus, getUserSubmissions } = require('../controllers/submissionController');
const auth = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// Submit solution
router.post('/submit/:problemId', auth, submitSolution);

// Get submission status
router.get('/status/:submissionId', auth, getSubmissionStatus);

// Get user submissions for a problem
router.get('/problem/:problemId', auth, getUserSubmissions);

module.exports = router;
