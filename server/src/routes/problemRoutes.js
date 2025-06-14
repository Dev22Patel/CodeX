const express = require('express');
const router = express.Router();
const ProblemController = require('../controllers/problemController');
const { validateProblem, validateProblemUpdate } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', ProblemController.getAllProblems);
router.get('/stats', ProblemController.getProblemStats);
router.get('/:identifier', ProblemController.getProblem);
router.get('/:problemId/submissions/history',authMiddleware, ProblemController.getProblemStats);
// implement karvanu baki che



// Protected routes (require authentication)

// Admin only routes
router.post('/', validateProblem, ProblemController.createProblem);
router.put('/:id', validateProblemUpdate, ProblemController.updateProblem);
router.delete('/:id', ProblemController.deleteProblem);
router.patch('/:id/stats', ProblemController.updateProblemStats);

module.exports = router;
