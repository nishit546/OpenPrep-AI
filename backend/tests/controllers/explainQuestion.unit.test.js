const { validateExplainQuestion } = require('../../middleware/validators');
const geminiService = require('../../services/geminiService');
const aiController = require('../../controllers/aiController');

function runValidators(validators, body) {
  return new Promise((resolve) => {
    const req = { body };
    const res = {
      code: null,
      data: null,
      status(c) {
        this.code = c;
        return this;
      },
      json(d) {
        this.data = d;
      },
    };

    let idx = 0;
    function next() {
      if (idx >= validators.length || res.code !== null) {
        resolve(res);
        return;
      }
      validators[idx++](req, res, next);
    }

    next();
    setTimeout(() => resolve(res), 1000);
  });
}

const validBody = {
  question: 'What is 2 + 2?',
  options: ['1', '2', '3', '4'],
  correctAnswer: 3,
  userAnswer: 1,
  mode: 'full',
  explanation: 'Basic addition',
};

describe('AI Question Explanation - Unit Tests', () => {
  beforeAll(() => {
    // Ensure no GEMINI_API_KEY is set so mock data is used
    delete process.env.GEMINI_API_KEY;
  });

  describe('validateExplainQuestion', () => {
    it('should pass with a valid numeric correctAnswer payload', async () => {
      const res = await runValidators(validateExplainQuestion, validBody);
      expect(res.code).toBeNull();
    });

    it('should pass when correctAnswer is the option text instead of an index', async () => {
      const res = await runValidators(validateExplainQuestion, {
        ...validBody,
        correctAnswer: '4',
      });
      expect(res.code).toBeNull();
    });

    it('should pass with hint mode, null userAnswer and no explanation', async () => {
      const res = await runValidators(validateExplainQuestion, {
        question: 'Q?',
        options: ['a', 'b', 'c', 'd'],
        correctAnswer: 0,
        userAnswer: null,
        mode: 'hint',
      });
      expect(res.code).toBeNull();
    });

    it('should pass when userAnswer is a valid option text', async () => {
      const res = await runValidators(validateExplainQuestion, { ...validBody, userAnswer: '2' });
      expect(res.code).toBeNull();
    });

    it('should reject missing question text', async () => {
      const res = await runValidators(validateExplainQuestion, { ...validBody, question: '' });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('Question text is required');
    });

    it('should reject options that are not an array', async () => {
      const res = await runValidators(validateExplainQuestion, {
        ...validBody,
        options: 'not-an-array',
      });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('Options must be an array');
    });

    it('should reject empty option strings', async () => {
      const res = await runValidators(validateExplainQuestion, {
        ...validBody,
        options: ['1', '', '3', '4'],
      });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('Each option must be non-empty');
    });

    it('should reject an out-of-range numeric correctAnswer', async () => {
      const res = await runValidators(validateExplainQuestion, { ...validBody, correctAnswer: 7 });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('correctAnswer');
    });

    it('should reject a correctAnswer that is neither an index nor an option', async () => {
      const res = await runValidators(validateExplainQuestion, {
        ...validBody,
        correctAnswer: 'zzz',
      });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('correctAnswer');
    });

    it('should reject an invalid mode', async () => {
      const res = await runValidators(validateExplainQuestion, { ...validBody, mode: 'spoiler' });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('mode');
    });

    it('should reject a userAnswer that is neither an index nor an option', async () => {
      const res = await runValidators(validateExplainQuestion, { ...validBody, userAnswer: 'zzz' });
      expect(res.code).toBe(400);
      expect(res.data.error).toContain('userAnswer');
    });
  });

  describe('geminiService.generateQuestionExplanation mock fallback', () => {
    it('should return a structured markdown hint in hint mode without revealing the answer', async () => {
      const result = await geminiService.generateQuestionExplanation({
        question: 'What is 2 + 2?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 3,
        userAnswer: 1,
        mode: 'hint',
      });

      expect(result).toHaveProperty('mode', 'hint');
      expect(result).toHaveProperty('markdown');
      expect(result.markdown).toContain('## Hint');
      expect(result.markdown).toContain('What is 2 + 2?');
    });

    it('should return a step-by-step markdown solution in full mode including the correct option', async () => {
      const result = await geminiService.generateQuestionExplanation({
        question: 'What is 2 + 2?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 3,
        userAnswer: 1,
        mode: 'full',
        explanation: 'Adding two and two yields four.',
      });

      expect(result).toHaveProperty('mode', 'full');
      expect(result.markdown).toContain('## Step-by-Step Solution');
      expect(result.markdown).toContain('**4**');
      expect(result.markdown).toContain('Adding two and two yields four.');
    });

    it('should accept correctAnswer as option text in mock mode', async () => {
      const result = await geminiService.generateQuestionExplanation({
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        mode: 'full',
      });

      expect(result.markdown).toContain('**Paris**');
    });
  });

  describe('aiController.explainQuestion', () => {
    const makeRes = () => {
      const res = {
        statusCode: null,
        body: null,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(d) {
          this.body = d;
        },
      };
      return res;
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should return 200 with the explanation data', async () => {
      vi.spyOn(geminiService, 'generateQuestionExplanation').mockResolvedValue({
        mode: 'full',
        markdown: '# Solved',
      });

      const req = {
        body: { ...validBody, mode: 'full' },
        query: {},
      };
      const res = makeRes();

      await aiController.explainQuestion(req, res, () => {});

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.markdown).toBe('# Solved');
      expect(res.body.data.mode).toBe('full');
    });

    it('should pass userAnswer null through to the service when not provided', async () => {
      const spy = vi
        .spyOn(geminiService, 'generateQuestionExplanation')
        .mockResolvedValue({ mode: 'hint', markdown: '## Hint' });

      const req = {
        body: { question: 'Q?', options: ['a', 'b', 'c', 'd'], correctAnswer: 0, mode: 'hint' },
        query: {},
      };
      const res = makeRes();

      await aiController.explainQuestion(req, res, () => {});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ userAnswer: null }));
    });

    it('should return 429 with retryAfter on GeminiRateLimitError', async () => {
      vi.spyOn(geminiService, 'generateQuestionExplanation').mockRejectedValue(
        new geminiService.GeminiRateLimitError(
          'Gemini API rate limit exceeded. Please try again later.',
          60
        )
      );

      const req = { body: validBody, query: {} };
      const res = makeRes();

      await aiController.explainQuestion(req, res, () => {});

      expect(res.statusCode).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.retryAfter).toBe(60);
    });

    it('should return 503 on GeminiServerError', async () => {
      vi.spyOn(geminiService, 'generateQuestionExplanation').mockRejectedValue(
        new geminiService.GeminiServerError(
          'Gemini API server error (503). Please try again later.',
          503
        )
      );

      const req = { body: validBody, query: {} };
      const res = makeRes();

      await aiController.explainQuestion(req, res, () => {});

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });
});
