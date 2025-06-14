const express = require('express');
const router = express.Router();
const TestCaseController = require('../controllers/testcaseController');
const { validateTestCase, validateMultipleTestCases } = require('../middleware/validation');

// Public routes (limited access to public test cases only)
router.get('/problem/:problemId', TestCaseController.getTestCasesByProblem);
router.get('/problem/:problemId/stats', TestCaseController.getTestCaseStats);

// Protected routes (require authentication)
router.get('/:id', TestCaseController.getTestCase);

// Admin only routes
router.post('/', validateTestCase, TestCaseController.createTestCase);
router.post('/bulk', validateMultipleTestCases, TestCaseController.createMultipleTestCases);
router.put('/:id', TestCaseController.updateTestCase);
router.delete('/:id', TestCaseController.deleteTestCase);
router.delete('/problem/:problemId', TestCaseController.deleteTestCasesByProblem);
router.patch('/:id/toggle-visibility', TestCaseController.toggleTestCaseVisibility);

module.exports = router;
