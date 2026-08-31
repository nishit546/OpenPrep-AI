import { describe, it, expect, beforeEach, vi } from 'vitest';

const fs = require('fs');
const path = require('path');

const CONTROLLER_PATH = path.join(__dirname, '..', '..', 'controllers', 'quizController.js');
const SOURCE = fs.readFileSync(CONTROLLER_PATH, 'utf8');

/**
 * A usage example for `quizGenerationService.generateQuestionsWithValidation`
 * was pasted into the middle of `generateCustomQuiz` and never adapted:
 *
 *   const quizGenerationService = require('../services/quizGenerationService');
 *   const generatedQuestions = await quizGenerationService.generateQuestionsWithValidation(
 *     topic,
 *     questionCount,
 *     sourceContext,
 *     req.body.quizId
 *   );
 *
 * None of `topic`, `questionCount` or `sourceContext` exist in the handler. It
 * destructures `topics`, computes `requestedCount`, and builds
 * `pyqQuestionsText`. So the first argument threw
 * `ReferenceError: topic is not defined` on every request to
 * `POST /api/quizzes/generate-custom`, and `generatedQuestions` was never read
 * even if it had resolved.
 *
 * Unlike a redeclaration in the same scope, this parses — the function-scoped
 * `const quizGenerationService` legally shadows the module-level one from the
 * #1907 refactor. So the module loaded, the router mounted, and the endpoint
 * 500'd at runtime with nothing failing at boot.
 *
 * The models are required at module load, so doubles go on the model objects
 * before the controller is required.
 */
const Subject = require('../../models/Subject');
const PYQAnalysis = require('../../models/PYQAnalysis');
const PYQQuestion = require('../../models/PYQQuestion');
const Quiz = require('../../models/Quiz');
const geminiService = require('../../services/geminiService');

const findByPk = vi.fn();
const analysisFindAll = vi.fn();
const questionFindAll = vi.fn();
const quizCreate = vi.fn();
const generateCustomQuiz = vi.fn();

Subject.findByPk = findByPk;
PYQAnalysis.findAll = analysisFindAll;
PYQQuestion.findAll = questionFindAll;
Quiz.create = quizCreate;
geminiService.generateCustomQuiz = generateCustomQuiz;

delete require.cache[require.resolve('../../controllers/quizController')];
const quizController = require('../../controllers/quizController');

function mockRes() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

const mockReq = (body = {}) => ({
  body: { subjectId: 'subject-1', topics: ['Kinematics'], count: 5, ...body },
  user: { id: 'user-1' },
  headers: {},
});

const aiQuiz = () => ({
  title: 'Physics Revision',
  questions: [
    {
      questionText: 'What is acceleration?',
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 0,
      explanation: 'rate of change of velocity',
    },
  ],
});

beforeEach(() => {
  findByPk.mockReset().mockResolvedValue({ id: 'subject-1', name: 'Physics' });
  analysisFindAll.mockReset().mockResolvedValue([{ id: 'analysis-1' }]);
  questionFindAll
    .mockReset()
    .mockResolvedValue([
      { year: 2023, topicName: 'Kinematics', marks: 4, questionText: 'Define velocity.' },
    ]);
  quizCreate.mockReset().mockImplementation(async (values) => ({ id: 'quiz-1', ...values }));
  generateCustomQuiz.mockReset().mockResolvedValue(aiQuiz());
});

describe('quizController source integrity', () => {
  it('parses as valid JavaScript', () => {
    expect(() => new Function(SOURCE)).not.toThrow();
  });

  it('declares quizGenerationService exactly once', () => {
    // The integrity gate reported this as
    // `controllers/quizController.js: quizGenerationService`. It is legal
    // shadowing rather than a redeclaration, which is why nothing failed at
    // load — the duplicate check is what caught it.
    const declarations = [
      ...SOURCE.matchAll(/(?:const|let|var)\s+quizGenerationService\s*=\s*require\(/g),
    ];

    expect(declarations).toHaveLength(1);
  });

  it('keeps that declaration at module scope', () => {
    // The surviving one is the #1907 refactor's, alongside
    // quizEvaluationService and quizAnalyticsService.
    const line = SOURCE.split('\n').find((entry) =>
      /(?:const|let|var)\s+quizGenerationService\s*=\s*require\(/.test(entry)
    );

    expect(line).toBeDefined();
    expect(line.startsWith('const')).toBe(true);
  });

  it('references no undefined identifiers inside generateCustomQuiz', () => {
    const start = SOURCE.indexOf('exports.generateCustomQuiz');
    const end = SOURCE.indexOf('exports.', start + 1);
    const body = SOURCE.slice(start, end);

    // The handler destructures `topics` and computes `requestedCount`; the
    // paste read `topic`, `questionCount` and `sourceContext`. `topic` itself
    // is not asserted on — the Quiz.create call legitimately sets `topic: null`
    // for a multi-topic quiz.
    for (const name of ['questionCount', 'sourceContext']) {
      expect(body, `generateCustomQuiz still references ${name}`).not.toMatch(
        new RegExp(`\\b${name}\\b`)
      );
    }

    // The paste's first argument, as a bare read rather than a property write.
    expect(body).not.toMatch(/^\s*topic,\s*$/m);
  });

  it('binds no unread result in generateCustomQuiz', () => {
    const start = SOURCE.indexOf('exports.generateCustomQuiz');
    const end = SOURCE.indexOf('exports.', start + 1);

    expect(SOURCE.slice(start, end)).not.toMatch(/\bgeneratedQuestions\b/);
  });

  it('keeps every statement in the handler indented inside it', () => {
    // The paste sat at column zero while still inside the try block.
    const start = SOURCE.indexOf('exports.generateCustomQuiz');
    const end = SOURCE.indexOf('exports.', start + 1);

    const stray = SOURCE.slice(start, end)
      .split('\n')
      .slice(1)
      .filter((line) => /^(?:const|let|var|return|await|if|res)\b/.test(line));

    expect(stray).toEqual([]);
  });

  it('exports the handler quizRoutes mounts', () => {
    const routes = fs.readFileSync(
      path.join(__dirname, '..', '..', 'routes', 'quizRoutes.js'),
      'utf8'
    );

    expect(routes).toMatch(/router\.post\('\/generate-custom'[\s\S]*?generateCustomQuiz\)/);
    expect(typeof quizController.generateCustomQuiz).toBe('function');
  });
});

describe('generateCustomQuiz validates its input', () => {
  it.each([
    ['negative', -3],
    ['above the cap', 51],
  ])('rejects a %s count with 400', async (_label, count) => {
    const res = mockRes();

    await quizController.generateCustomQuiz(mockReq({ count }), res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/between 1 and 50/);
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('accepts the cap itself', async () => {
    const res = mockRes();

    await quizController.generateCustomQuiz(mockReq({ count: 50 }), res, vi.fn());

    expect(res.statusCode).toBe(201);
  });

  it('defaults an unparseable count to 5', async () => {
    await quizController.generateCustomQuiz(mockReq({ count: 'many' }), mockRes(), vi.fn());

    expect(generateCustomQuiz.mock.calls[0][3]).toBe(5);
  });

  it('defaults a zero count to 5 rather than rejecting it', async () => {
    // `parseInt(0, 10) || 5` — zero is falsy, so it takes the default and
    // never reaches the range check. Pinned as observed behaviour, not
    // endorsed: it is inconsistent with -3 being rejected.
    const res = mockRes();

    await quizController.generateCustomQuiz(mockReq({ count: 0 }), res, vi.fn());

    expect(res.statusCode).toBe(201);
    expect(generateCustomQuiz.mock.calls[0][3]).toBe(5);
  });

  it('404s an unknown subject', async () => {
    findByPk.mockResolvedValue(null);
    const res = mockRes();

    await quizController.generateCustomQuiz(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, error: 'Subject not found' });
  });
});

describe('generateCustomQuiz reaches the generation call', () => {
  it('completes without a ReferenceError', async () => {
    // The regression itself: every request threw `topic is not defined` before
    // reaching this point.
    const next = vi.fn();
    const res = mockRes();

    await quizController.generateCustomQuiz(mockReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
  });

  it('does not call the validation service from this handler', async () => {
    // The paste never worked, and wiring it in properly would replace the
    // Gemini path — a feature change, not part of this fix.
    const spy = vi.fn();
    const service = require('../../services/quizGenerationService');
    const original = service.generateQuestionsWithValidation;
    service.generateQuestionsWithValidation = spy;

    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    service.generateQuestionsWithValidation = original;
    expect(spy).not.toHaveBeenCalled();
  });

  it('scopes the PYQ analysis lookup to the subject', async () => {
    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(analysisFindAll).toHaveBeenCalledWith({ where: { subjectId: 'subject-1' } });
  });

  it('filters PYQ questions by the requested topics', async () => {
    await quizController.generateCustomQuiz(
      mockReq({ topics: ['Kinematics', 'Optics'] }),
      mockRes(),
      vi.fn()
    );

    expect(questionFindAll.mock.calls[0][0].where.topicName).toEqual(['Kinematics', 'Optics']);
  });

  it('filters PYQ questions by the requested years', async () => {
    await quizController.generateCustomQuiz(mockReq({ years: [2022, 2023] }), mockRes(), vi.fn());

    expect(questionFindAll.mock.calls[0][0].where.year).toEqual([2022, 2023]);
  });

  it('omits empty filters rather than matching on an empty array', async () => {
    await quizController.generateCustomQuiz(mockReq({ topics: [], years: [] }), mockRes(), vi.fn());

    const { where } = questionFindAll.mock.calls[0][0];

    expect(where.topicName).toBeUndefined();
    expect(where.year).toBeUndefined();
  });

  it('passes the subject name and capitalised difficulty to Gemini', async () => {
    await quizController.generateCustomQuiz(mockReq({ difficulty: 'hard' }), mockRes(), vi.fn());

    const [subjectName, topics, difficultyLevel] = generateCustomQuiz.mock.calls[0];

    expect(subjectName).toBe('Physics');
    expect(topics).toEqual(['Kinematics']);
    expect(difficultyLevel).toBe('Hard');
  });

  it('defaults the difficulty to medium', async () => {
    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(generateCustomQuiz.mock.calls[0][2]).toBe('Medium');
  });

  it('passes the formatted PYQ context', async () => {
    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(generateCustomQuiz.mock.calls[0][4]).toBe(
      '[Year: 2023, Topic: Kinematics, Marks: 4] Define velocity.'
    );
  });

  it('passes an empty context when the subject has no PYQs', async () => {
    questionFindAll.mockResolvedValue([]);

    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(generateCustomQuiz.mock.calls[0][4]).toBe('');
  });
});

describe('generateCustomQuiz persists the quiz', () => {
  it('creates it against the requesting user and subject', async () => {
    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(quizCreate.mock.calls[0][0]).toMatchObject({
      subject: 'subject-1',
      topic: null,
      type: 'AI_Generated',
      createdBy: 'user-1',
    });
  });

  it('assigns each question a uuid', async () => {
    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    const [question] = quizCreate.mock.calls[0][0].questions;

    expect(question._id).toMatch(/^[0-9a-f-]{36}$/);
    expect(question.questionText).toBe('What is acceleration?');
  });

  it('defaults a missing explanation to an empty string', async () => {
    generateCustomQuiz.mockResolvedValue({
      title: 'T',
      questions: [{ questionText: 'q', options: [], correctAnswer: 0 }],
    });

    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(quizCreate.mock.calls[0][0].questions[0].explanation).toBe('');
  });

  it('falls back to a generated title', async () => {
    generateCustomQuiz.mockResolvedValue({ questions: [] });

    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(quizCreate.mock.calls[0][0].title).toBe('Physics Custom Revision Quiz');
  });

  it('defaults the time limit to 20 minutes', async () => {
    await quizController.generateCustomQuiz(mockReq(), mockRes(), vi.fn());

    expect(quizCreate.mock.calls[0][0].timeLimit).toBe(20);
  });

  it('honours a supplied time limit and language', async () => {
    await quizController.generateCustomQuiz(
      mockReq({ timeLimit: 45, language: 'hindi' }),
      mockRes(),
      vi.fn()
    );

    expect(quizCreate.mock.calls[0][0]).toMatchObject({ timeLimit: 45, language: 'hindi' });
  });

  it('returns 201 with the created quiz', async () => {
    const res = mockRes();

    await quizController.generateCustomQuiz(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.id).toBe('quiz-1');
  });
});

describe('generateCustomQuiz error handling', () => {
  it('answers a Gemini rate limit with 429 and a retry hint', async () => {
    const { GeminiRateLimitError } = require('../../services/geminiService');
    const error = new GeminiRateLimitError('slow down');
    error.retryAfter = 30;
    generateCustomQuiz.mockRejectedValue(error);

    const res = mockRes();
    await quizController.generateCustomQuiz(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(429);
    expect(res.payload.retryAfter).toBe(30);
  });

  it('forwards an unexpected failure to next()', async () => {
    const failure = new Error('connection terminated');
    findByPk.mockRejectedValue(failure);
    const next = vi.fn();

    await quizController.generateCustomQuiz(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });

  it('forwards a ReferenceError rather than swallowing it', async () => {
    // Worth pinning: the paste's ReferenceError did reach next(), so the
    // endpoint 500'd rather than failing silently. That is the behaviour the
    // handler should keep for genuine bugs.
    const failure = new ReferenceError('topic is not defined');
    generateCustomQuiz.mockRejectedValue(failure);
    const next = vi.fn();

    await quizController.generateCustomQuiz(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});
