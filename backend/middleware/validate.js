const { z } = require('zod');

/**
 * Reusable request body validation middleware using Zod
 * @param {z.ZodSchema} schema 
 */
const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || error.errors || [];
        const fieldErrors = issues.map((err) => ({
          field: err.path ? err.path.join('.') : '',
          message: err.message,
        }));
        
        const errorString = issues.map((err) => err.message).join(', ');

        return res.status(400).json({
          success: false,
          error: errorString,
          details: fieldErrors,
        });
      }
      next(error);
    }
  };
};

// Zod schema definitions

// User Auth - Registration
const registerSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  })
  .trim()
  .min(2, 'Name must be between 2 and 50 characters')
  .max(50, 'Name must be between 2 and 50 characters'),
  
  email: z.string({
    required_error: 'Email is required',
  })
  .trim()
  .email('Please provide a valid email address'),
  
  password: z.string({
    required_error: 'Password is required',
  })
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Password must contain at least one number',
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: 'Password must contain at least one special character',
  }),
}).strict();

// User Auth - Login
const loginSchema = z.object({
  email: z.string({
    required_error: 'Email is required',
  })
  .trim()
  .email('Please provide a valid email address'),

  password: z.string({
    required_error: 'Password is required',
  })
  .min(1, 'Password is required'),
}).strict();

// User Auth - Profile Update
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  email: z.string().trim().email('Please provide a valid email address').optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().optional(),
  targetExam: z.string().optional(),
}).strict();

// Quiz - AI Generation & Creation
const createQuizSchema = z.object({
  subjectId: z.string({
    required_error: 'Valid subject ID is required',
  }).uuid('Valid subject ID is required'),
  
  topicId: z.string().uuid('Valid topic ID is required').optional(),
  numQuestions: z.number().int().min(1).max(50).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  title: z.string().min(1).max(200).optional(),
}).strict();

// Flashcards - Deck & Card Creation
const createFlashcardDeckSchema = z.object({
  subjectId: z.string({
    required_error: 'Valid subject ID is required',
  }).uuid('Valid subject ID is required'),

  topicId: z.string().uuid('Valid topic ID is required').optional(),
  title: z.string({
    required_error: 'Please provide a deck title',
  }).trim().min(1, 'Please provide a deck title').max(200),

  cards: z.array(
    z.object({
      front: z.string({ required_error: 'Front text is required' }).min(1),
      back: z.string({ required_error: 'Back text is required' }).min(1),
    }).strict()
  ).optional(),
}).strict();

// Study Plan - Task Updates
const updateStudyTaskSchema = z.object({
  completed: z.boolean().optional(),
  studyTimeMinutes: z.number().min(0, 'Study time must be a non-negative number').optional(),
  title: z.string().min(1).max(200).optional(),
  newDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'A valid newDate is required',
  }).optional(),
}).strict();

// Study Plan - Creation
const createStudyPlanSchema = z.object({
  examId: z.string({
    required_error: 'Valid exam ID is required',
  }).uuid('Valid exam ID is required'),
  
  startDate: z.string({
    required_error: 'Start date is required',
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'Start date must be a valid ISO date',
  }),
  
  endDate: z.string({
    required_error: 'End date is required',
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'End date must be a valid ISO date',
  }),
  
  studyHoursPerDay: z.number().min(0.5, 'Study hours per day must be between 0.5 and 24').max(24, 'Study hours per day must be between 0.5 and 24').optional(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Quiz - Submission
const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string({
        required_error: 'Each answer must have a questionId',
      }).uuid('Each questionId must be a valid UUID'),
      selectedAnswer: z.union([
        z.string(),
        z.number(),
        z.object({
          userAnswerText: z.string(),
          evaluationReceipt: z.string().min(1).optional(),
        }),
      ], {
        required_error: 'Each answer must have a valid selectedAnswer',
      }),
    })
  ).min(1, 'Answers must be a non-empty array'),
  
  timeSpent: z.number().min(0, 'timeSpent must be a non-negative number no greater than 86400 (24 hours)').max(86400, 'timeSpent must be a non-negative number no greater than 86400 (24 hours)').optional(),
  submissionId: z.string().uuid('submissionId must be a valid UUID').optional(),
});

module.exports = {
  validateRequest,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createQuizSchema,
  createFlashcardDeckSchema,
  updateStudyTaskSchema,
  createStudyPlanSchema,
  submitQuizSchema,
};
