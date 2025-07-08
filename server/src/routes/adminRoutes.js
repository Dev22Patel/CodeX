// backend/routes/admin.js
const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const {
  getAllProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  createContest,
  createContestProblem,
  createContestTestCase,
} = require('../controllers/adminController');

const router = express.Router();

// Apply admin authentication middleware to all routes
router.use(adminAuth);

// Problem routes
router.get('/problems', getAllProblems);
router.get('/problems/:id', getProblem);
router.post('/problems', createProblem);
router.put('/problems/:id', updateProblem);
router.delete('/problems/:id', deleteProblem);

// Test case routes
router.post('/problems/:problemId/test-cases', createTestCase);
router.put('/test-cases/:id', updateTestCase);
router.delete('/test-cases/:id', deleteTestCase);

// Contest routes
router.post('/contests', createContest);
router.post('/contests/:contestId/problems', createContestProblem);
router.post('/contests/problems/:contestProblemId/test-cases', createContestTestCase);

module.exports = router;
