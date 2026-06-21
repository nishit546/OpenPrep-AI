const { body, param, query, validationResult } = require('express-validator');

// ---------------------------------------------------------------------------
// Shared: format validation errors consistently with project error format
// ---------------------------------------------------------------------------
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    return res.status(400).json({
      success: false,
      error: messages.join(', '),
    });
  }
  next();
};

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Please add a name'),
  body('email').trim().isEmail().withMessage('Please add a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Please provide a password'),
  handleValidationErrors,
];

const validateForgotPassword = [
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Academic routes
// ---------------------------------------------------------------------------
const validateCreateExam = [
  body('name').trim().notEmpty().withMessage('Please provide an exam name'),
  handleValidationErrors,
];

const validateCreateSubject = [
  body('name').trim().notEmpty().withMessage('Please provide a subject name'),
  body('examId').isMongoId().withMessage('Valid exam ID is required'),
  handleValidationErrors,
];

const validateCreateTopic = [
  body('name').trim().notEmpty().withMessage('Please provide a topic name'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  handleValidationErrors,
];

const validateUpdateTopic = [
  body('status')
    .optional()
    .isIn(['Weak', 'Medium', 'Strong'])
    .withMessage('Status must be one of: Weak, Medium, Strong'),
  body('weightage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weightage must be a non-negative number'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Flashcard routes
// ---------------------------------------------------------------------------
const validateGenerateAIFlashcards = [
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  handleValidationErrors,
];

const validateCreateFlashcard = [
  body('front').trim().notEmpty().withMessage('Please provide the front text'),
  body('back').trim().notEmpty().withMessage('Please provide the back text'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  handleValidationErrors,
];

const validateReviewFlashcard = [
  body('quality')
    .isFloat({ min: 0, max: 5 })
    .withMessage('Quality must be a number between 0 and 5'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Quiz routes
// ---------------------------------------------------------------------------
const validateGenerateAIQuiz = [
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  handleValidationErrors,
];

const validateSubmitQuizAttempt = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers must be a non-empty array'),
  body('answers.*.questionId')
    .notEmpty()
    .withMessage('Each answer must have a questionId'),
  body('answers.*.selectedAnswer')
    .notEmpty()
    .withMessage('Each answer must have a selectedAnswer'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Note routes
// ---------------------------------------------------------------------------
const validateUploadNote = [
  body('title').trim().notEmpty().withMessage('Please provide a note title'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('content').optional().trim(),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// PYQ routes
// ---------------------------------------------------------------------------
const validateUploadPYQ = [
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Year must be a valid year'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Study Plan routes
// ---------------------------------------------------------------------------
const validateGenerateAIPlan = [
  body('examId').isMongoId().withMessage('Valid exam ID is required'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  body('studyHoursPerDay')
    .optional()
    .isFloat({ min: 0.5, max: 24 })
    .withMessage('Study hours per day must be between 0.5 and 24'),
  handleValidationErrors,
];

const validateToggleTask = [
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  body('studyTimeMinutes')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Study time must be a non-negative number'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Community routes
// ---------------------------------------------------------------------------
const validateSubmitFeedback = [
  body('title').trim().notEmpty().withMessage('Please provide a feedback title'),
  body('description').trim().notEmpty().withMessage('Please provide a description'),
  body('type')
    .trim()
    .isIn(['bug', 'feature_request'])
    .withMessage('Type must be either "bug" or "feature_request"'),
  handleValidationErrors,
];

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  validateForgotPassword,
  // Academic
  validateCreateExam,
  validateCreateSubject,
  validateCreateTopic,
  validateUpdateTopic,
  // Flashcard
  validateGenerateAIFlashcards,
  validateCreateFlashcard,
  validateReviewFlashcard,
  // Quiz
  validateGenerateAIQuiz,
  validateSubmitQuizAttempt,
  // Note
  validateUploadNote,
  // PYQ
  validateUploadPYQ,
  // Study Plan
  validateGenerateAIPlan,
  validateToggleTask,
  // Community
  validateSubmitFeedback,
};
