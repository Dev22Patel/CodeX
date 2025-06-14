const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Problem validation rules
const validateProblem = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('slug')
    .notEmpty()
    .withMessage('Slug is required')
    .isSlug()
    .withMessage('Slug must be URL-friendly')
    .isLength({ min: 3, max: 100 })
    .withMessage('Slug must be between 3 and 100 characters'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),

  body('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Difficulty must be EASY, MEDIUM, or HARD'),

  body('timeLimit')
    .optional()
    .isInt({ min: 100, max: 30000 })
    .withMessage('Time limit must be between 100ms and 30 seconds'),

  body('memoryLimit')
    .optional()
    .isInt({ min: 16, max: 1024 })
    .withMessage('Memory limit must be between 16MB and 1024MB'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be a string between 1 and 50 characters'),

  body('testCases')
    .optional()
    .isArray()
    .withMessage('Test cases must be an array'),

  body('testCases.*.input')
    .if(body('testCases').exists())
    .notEmpty()
    .withMessage('Test case input is required'),

  body('testCases.*.expectedOutput')
    .if(body('testCases').exists())
    .notEmpty()
    .withMessage('Test case expected output is required'),

  body('testCases.*.isPublic')
    .optional()
    .isBoolean()
    .withMessage('Test case isPublic must be a boolean'),

  body('testCases.*.points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Test case points must be between 1 and 100'),

  handleValidationErrors
];

// Problem update validation (all fields optional)
const validateProblemUpdate = [
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('slug')
    .optional()
    .isSlug()
    .withMessage('Slug must be URL-friendly')
    .isLength({ min: 3, max: 100 })
    .withMessage('Slug must be between 3 and 100 characters'),

  body('description')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),

  body('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Difficulty must be EASY, MEDIUM, or HARD'),

  body('timeLimit')
    .optional()
    .isInt({ min: 100, max: 30000 })
    .withMessage('Time limit must be between 100ms and 30 seconds'),

  body('memoryLimit')
    .optional()
    .isInt({ min: 16, max: 1024 })
    .withMessage('Memory limit must be between 16MB and 1024MB'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be a string between 1 and 50 characters'),

  body('testCases')
    .optional()
    .isArray()
    .withMessage('Test cases must be an array'),

  body('testCases.*.input')
    .optional()
    .if(body('testCases').exists())
    .notEmpty()
    .withMessage('Test case input is required'),

  body('testCases.*.expectedOutput')
    .optional()
    .if(body('testCases').exists())
    .notEmpty()
    .withMessage('Test case expected output is required'),

  body('testCases.*.isPublic')
    .optional()
    .isBoolean()
    .withMessage('Test case isPublic must be a boolean'),

  body('testCases.*.points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Test case points must be between 1 and 100'),

  body('testCases.*.timeLimit')
    .optional()
    .isInt({ min: 100, max: 30000 })
    .withMessage('Test case time limit must be between 100ms and 30 seconds'),

  body('testCases.*.memoryLimit')
    .optional()
    .isInt({ min: 16, max: 1024 })
    .withMessage('Test case memory limit must be between 16MB and 1024MB'),

  handleValidationErrors
];

module.exports = {
  validateProblem,
  validateProblemUpdate
};
