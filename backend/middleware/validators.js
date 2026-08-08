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
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Please provide a password'),
  handleValidationErrors,
];

const validateForgotPassword = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  handleValidationErrors,
];

const validateResetPassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  handleValidationErrors,
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors,
];

const validateResendVerification = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  handleValidationErrors,
];

const validateUpdateSettings = [
  body('leaderboardVisible')
    .optional()
    .isBoolean()
    .withMessage('leaderboardVisible must be a boolean'),
  body('receiveWeeklyDigest')
    .optional()
    .isBoolean()
    .withMessage('receiveWeeklyDigest must be a boolean'),
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
  body('examId').isUUID(4).withMessage('Valid exam ID is required'),
  handleValidationErrors,
];

const validateCreateTopic = [
  body('name').trim().notEmpty().withMessage('Please provide a topic name'),
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
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
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  handleValidationErrors,
];

const validateGenerateFlashcardsFromNote = [
  body('noteId').isUUID(4).withMessage('Valid note ID is required'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  handleValidationErrors,
];

const validateGenerateFlashcardsFromYouTube = [
  body('youtubeUrl')
    .trim()
    .notEmpty()
    .withMessage('Please provide a YouTube video URL')
    .matches(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i)
    .withMessage('Please provide a valid YouTube URL'),
  body('subjectId').optional().isUUID(4).withMessage('Valid subject ID is required'),
  body('topicId').optional().isUUID(4).withMessage('Valid topic ID is required'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  handleValidationErrors,
];
const validateCreateFlashcard = [  body('front').trim().notEmpty().withMessage('Please provide the front text'),
  body('back').trim().notEmpty().withMessage('Please provide the back text'),
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
  handleValidationErrors,
];

const validateAutoTagFlashcard = [
  body('front').trim().notEmpty().withMessage('Please provide the front text'),
  body('back').trim().notEmpty().withMessage('Please provide the back text'),
  handleValidationErrors,
];
const validateReviewFlashcard = [
  body('quality')
    .isFloat({ min: 0, max: 5 })
    .withMessage('Quality must be a number between 0 and 5'),
  handleValidationErrors,
];

const validateExportFlashcards = [
  query('format')
    .optional()
    .isIn(['json', 'csv', 'apkg'])
    .withMessage('format must be "json", "csv", or "apkg"'),
  query('subjectId')
    .optional()
    .isUUID(4)
    .withMessage('subjectId must be a valid UUID'),
  handleValidationErrors,
];

const validateImportFlashcards = [
  query('subjectId')
    .notEmpty().withMessage('subjectId query parameter is required')
    .isUUID(4).withMessage('subjectId must be a valid UUID'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Quiz routes
// ---------------------------------------------------------------------------
const validateGenerateAIQuiz = [
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  handleValidationErrors,
];

const validateGenerateRevisionSheet = [
  body('quizAttemptId')
    .optional()
    .isUUID()
    .withMessage('quizAttemptId must be a valid UUID'),
  body('subjectId')
    .optional()
    .isUUID()
    .withMessage('subjectId must be a valid UUID'),
  body('topicId')
    .optional()
    .isUUID()
    .withMessage('topicId must be a valid UUID'),
  body('mistookQuestions')
    .optional()
    .isArray()
    .withMessage('mistookQuestions must be an array'),
  body('saveToNotes')
    .optional()
    .isBoolean()
    .withMessage('saveToNotes must be a boolean'),
  handleValidationErrors,
];

const validateSubmitQuizAttempt = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers must be a non-empty array'),
  body('answers.*.questionId')
    .notEmpty()
    .withMessage('Each answer must have a questionId')
    .isUUID(4)
    .withMessage('Each questionId must be a valid UUID'),
  body('answers.*.selectedAnswer')
    .isInt({ min: 0, max: 3 })
    .withMessage('Each answer must have a valid selectedAnswer option index'),
  body('timeSpent')
    .optional()
    .isFloat({ min: 0, max: 86400 })
    .withMessage('timeSpent must be a non-negative number no greater than 86400 (24 hours)'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// Note routes
// ---------------------------------------------------------------------------
const validateUploadNote = [
  body('title').trim().notEmpty().withMessage('Please provide a note title'),
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
  body('content').optional().trim(),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  handleValidationErrors,
];

const validateImportNotes = [
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
  body('topicId').optional().isUUID(4).withMessage('Valid topic ID is required'),
  handleValidationErrors,
];
// ---------------------------------------------------------------------------
// PYQ routes
// ---------------------------------------------------------------------------
const validateUploadPYQ = [
  body('subjectId').isUUID(4).withMessage('Valid subject ID is required'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Year must be a valid year'),
  body('difficulty')
    .optional()
    .isIn(['Easy', 'Medium', 'Hard'])
    .withMessage('Difficulty must be "Easy", "Medium", or "Hard"'),
  handleValidationErrors,
];
// ---------------------------------------------------------------------------
// Study Plan routes
// ---------------------------------------------------------------------------
const validateGenerateAIPlan = [
  body('examId').isUUID(4).withMessage('Valid exam ID is required'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
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

const validateMoveTaskDate = [
  body('newDate').isISO8601().withMessage('A valid newDate is required'),
  handleValidationErrors,
];
// ---------------------------------------------------------------------------
// Progress routes
// ---------------------------------------------------------------------------
const validateTrackStudyTime = [
  body('studyHours')
    .isFloat({ min: 0.01 })
    .withMessage('Study hours must be a positive number'),
  body('subjectId')
    .optional()
    .isUUID(4)
    .withMessage('Subject ID must be a valid UUID'),
  body('topicId')
    .optional()
    .isUUID(4)
    .withMessage('Topic ID must be a valid UUID'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  handleValidationErrors,
];

const validateFocusSession = [
  body('activeSeconds')
    .isInt({ min: 0 })
    .withMessage('Active seconds must be a non-negative integer'),
  body('pausedSeconds')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Paused seconds must be a non-negative integer'),
  body('interruptions')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Interruptions must be a non-negative integer'),
  body('subjectId')
    .optional()
    .isUUID(4)
    .withMessage('Subject ID must be a valid UUID'),
  handleValidationErrors,
];

const validateUpdateTopicProgress = [  body('completionPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100'),
  body('studyHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Study hours must be a non-negative number'),
  body('flashcardsMastered')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Flashcards mastered must be a non-negative integer'),
  body('quizScores')
    .optional()
    .isArray()
    .withMessage('Quiz scores must be an array'),
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
  validateResetPassword,
  validateRefreshToken,
  validateUpdateSettings,
  // Academic
  validateCreateExam,
  validateCreateSubject,
  validateCreateTopic,
  validateUpdateTopic,
// Flashcard
validateGenerateAIFlashcards,
  validateGenerateFlashcardsFromNote,
  validateGenerateFlashcardsFromYouTube,validateCreateFlashcard,  validateReviewFlashcard,
  validateAutoTagFlashcard,
  validateExportFlashcards,
  validateImportFlashcards,  // Quiz
  validateGenerateAIQuiz,
  validateGenerateRevisionSheet,
  validateSubmitQuizAttempt,
// Note
  validateUploadNote,
  validateImportNotes,
  // PYQ  validateUploadPYQ,
// Study Plan
  validateGenerateAIPlan,
  validateToggleTask,
  validateMoveTaskDate,// Progress
  validateTrackStudyTime,
  validateUpdateTopicProgress,
  validateFocusSession,  // Community
  validateSubmitFeedback,
  validateResendVerification,
};
