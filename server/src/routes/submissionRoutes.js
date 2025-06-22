const express = require('express');
const router = express.Router();
const { submitSolution, getSubmissionStatus, getUserSubmissions } = require('../controllers/submissionController');
const auth = require('../middleware/authMiddleware');

router.post('/submit/:problemId', auth, submitSolution);
router.get('/status/:submissionId', auth, getSubmissionStatus);
router.get('/problem/:problemId', auth, getUserSubmissions);

module.exports = router;
