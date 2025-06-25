const express = require('express');
const router = express.Router();
const { submitSolution, getSubmissionStatus, getUserSubmissions } = require('../controllers/submissionController');
const auth = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter'); // <- import

router.post('/submit/:problemId', auth, rateLimiter, submitSolution); // <- apply here
router.get('/status/:submissionId', auth, getSubmissionStatus);
router.get('/problem/:problemId', auth, getUserSubmissions);

module.exports = router;
