const express = require('express');
const router = express.Router();
const ProblemController = require('../controllers/problemController');
const { validateProblem, validateProblemUpdate } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

// Create optional auth middleware that doesn't throw error if not authenticated
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user
  }

  // If auth header exists, use the auth middleware
  return authMiddleware(req, res, next);
};

// Public routes with optional authentication
router.get('/', optionalAuth, ProblemController.getAllProblems);
router.get('/stats', optionalAuth, ProblemController.getProblemStats);
router.get('/:identifier', optionalAuth, ProblemController.getProblem);

// Protected routes
router.get('/:problemId/submissions/history', authMiddleware, ProblemController.getUserSubmissionHistory);

// Admin routes (you'll need admin middleware)
router.post('/', authMiddleware, validateProblem, ProblemController.createProblem);
router.put('/:id', authMiddleware, validateProblemUpdate, ProblemController.updateProblem);
router.delete('/:id', authMiddleware, ProblemController.deleteProblem);
router.put('/:id/stats', authMiddleware, ProblemController.updateProblemStats);

module.exports = router;
