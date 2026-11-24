import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const {
  refineWeakQuestions,
  scoreDistractorQuality,
} = require('../../services/distractorQualityService');

// Questions in the shape geminiService.generateQuiz returns (correctAnswer is an index)
const GOOD = {
  questionText: 'Which gas do plants absorb during photosynthesis?',
  options: ['Carbon dioxide', 'Oxygen gas', 'Nitrogen gas', 'Water vapour'],
  correctAnswer: 0,
  explanation: 'Plants take in carbon dioxide.',
};

const WEAK = {
  questionText: 'Which organelle produces most of the energy in a cell?',
  options: [
    'The mitochondria, which make ATP through oxidative phosphorylation',
    'Always the nucleus',
    'Never the ribosome',
    'None of the above',
  ],
  correctAnswer: 0,
  explanation: 'Mitochondria make ATP.',
};

const WEAK_REWRITTEN = {
  questionText: WEAK.questionText,
  options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi body'],
  correctAnswer: 0,
  explanation: 'Mitochondria make ATP.',
};

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn() });

describe('refineWeakQuestions', () => {
  it('does not call the model when every question passes', async () => {
    const regenerate = vi.fn();
    const questions = [GOOD, GOOD];
    const result = await refineWeakQuestions(questions, regenerate, { logger: silentLogger() });
    expect(regenerate).not.toHaveBeenCalled();
    expect(result).toBe(questions);
  });

  it('sends only the weak questions with their issues and swaps in a better rewrite', async () => {
    const regenerate = vi.fn().mockResolvedValue([WEAK_REWRITTEN]);
    const result = await refineWeakQuestions([GOOD, WEAK], regenerate, {
      logger: silentLogger(),
    });

    expect(regenerate).toHaveBeenCalledTimes(1);
    const [batch] = regenerate.mock.calls[0];
    expect(batch).toHaveLength(1);
    expect(batch[0].question).toBe(WEAK);
    expect(batch[0].issues.join(' ')).toMatch(/giveaway wording/);

    expect(result[0]).toBe(GOOD);
    expect(result[1].options).toEqual(WEAK_REWRITTEN.options);
    expect(scoreDistractorQuality(result[1]).score).toBeGreaterThan(
      scoreDistractorQuality(WEAK).score
    );
  });

  it('keeps the original when the rewrite scores lower', async () => {
    const worse = {
      ...WEAK,
      options: [
        WEAK.options[0],
        'Always the nucleus, never the ribosome',
        'Never',
        'None of the above, all of the above',
      ],
    };
    expect(scoreDistractorQuality(worse).score).toBeLessThan(scoreDistractorQuality(WEAK).score);
    const result = await refineWeakQuestions([WEAK], vi.fn().mockResolvedValue([worse]), {
      logger: silentLogger(),
    });
    expect(result[0]).toBe(WEAK);
  });

  it('ignores malformed rewrites', async () => {
    const malformed = [
      { ...WEAK_REWRITTEN, correctAnswer: 7 },
      { ...WEAK_REWRITTEN, options: ['Mitochondria', 'Nucleus'] },
      { ...WEAK_REWRITTEN, options: ['Nucleus', 'nucleus', 'Ribosome', 'Golgi body'] },
      { ...WEAK_REWRITTEN, questionText: '' },
      null,
    ];
    for (const bad of malformed) {
      const result = await refineWeakQuestions([WEAK], vi.fn().mockResolvedValue([bad]), {
        logger: silentLogger(),
      });
      expect(result[0]).toBe(WEAK);
    }
  });

  it('caps how many questions go into the single rewrite call', async () => {
    const regenerate = vi.fn().mockResolvedValue([]);
    await refineWeakQuestions([WEAK, WEAK, WEAK, WEAK], regenerate, {
      maxRegenerations: 2,
      logger: silentLogger(),
    });
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(regenerate.mock.calls[0][0]).toHaveLength(2);
  });

  it('logs and returns the original questions when the rewrite call fails', async () => {
    const logger = silentLogger();
    const questions = [GOOD, WEAK];
    const regenerate = vi.fn().mockRejectedValue(new Error('rate limited'));
    const result = await refineWeakQuestions(questions, regenerate, { logger });
    expect(result).toBe(questions);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/rate limited/));
  });

  it('skips subjective questions that have no options', async () => {
    const regenerate = vi.fn();
    const subjective = { questionType: 'SUBJECTIVE', questionText: 'Explain osmosis.' };
    await refineWeakQuestions([subjective], regenerate, { logger: silentLogger() });
    expect(regenerate).not.toHaveBeenCalled();
  });
});

function fakeModel(responses) {
  const prompts = [];
  return {
    prompts,
    model: 'gemini-1.5-flash',
    generateContent: vi.fn(async (prompt) => {
      prompts.push(prompt);
      const next = responses[Math.min(prompts.length - 1, responses.length - 1)];
      if (next instanceof Error) throw next;
      return { response: { text: () => JSON.stringify(next) } };
    }),
  };
}

describe('geminiService.generateQuiz distractor refinement', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  let GoogleGenerativeAI;
  let originalGetModel;
  let geminiService;
  let model;

  beforeAll(() => {
    ({ GoogleGenerativeAI } = require('@google/generative-ai'));
    originalGetModel = GoogleGenerativeAI.prototype.getGenerativeModel;
    GoogleGenerativeAI.prototype.getGenerativeModel = () => model;
    // geminiService reads the key when it is loaded, so load a fresh copy with one set
    process.env.GEMINI_API_KEY = 'test-key';
    delete require.cache[require.resolve('../../services/geminiService')];
    geminiService = require('../../services/geminiService');
  });

  afterAll(() => {
    GoogleGenerativeAI.prototype.getGenerativeModel = originalGetModel;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    delete require.cache[require.resolve('../../services/geminiService')];
  });

  it('rewrites a weak question with one extra model call', async () => {
    model = fakeModel([
      { title: 'Biology quiz', questions: [GOOD, WEAK] },
      { questions: [WEAK_REWRITTEN] },
    ]);
    const quiz = await geminiService.generateQuiz('Biology', 'Cells', '', 2, true);

    expect(model.generateContent).toHaveBeenCalledTimes(2);
    expect(model.prompts[1]).toMatch(/giveaway wording/);
    expect(model.prompts[1]).toMatch(/forgotten minus sign/);
    expect(quiz.questions[0]).toEqual(GOOD);
    expect(quiz.questions[1].options).toEqual(WEAK_REWRITTEN.options);
  });

  it('makes no extra call when every question passes', async () => {
    model = fakeModel([{ title: 'Biology quiz', questions: [GOOD] }]);
    await geminiService.generateQuiz('Biology', 'Plants', '', 1, true);
    expect(model.generateContent).toHaveBeenCalledTimes(1);
  });

  it('returns the original quiz when the rewrite call fails', async () => {
    model = fakeModel([
      { title: 'Biology quiz', questions: [GOOD, WEAK] },
      new Error('upstream exploded'),
    ]);
    const quiz = await geminiService.generateQuiz('Biology', 'Energy', '', 2, true);

    expect(model.generateContent).toHaveBeenCalledTimes(2);
    expect(quiz.questions[1].options).toEqual(WEAK.options);
  });

  it('does not retry the rewrite call on a server error', async () => {
    const serverError = Object.assign(new Error('Service Unavailable'), { status: 503 });
    model = fakeModel([{ title: 'Biology quiz', questions: [WEAK] }, serverError]);
    const quiz = await geminiService.generateQuiz('Biology', 'Organelles', '', 1, true);

    expect(model.generateContent).toHaveBeenCalledTimes(2);
    expect(quiz.questions[0].options).toEqual(WEAK.options);
  });

  it('retries an incomplete response and caches only the validated quiz', async () => {
    model = fakeModel([
      { title: 'Incomplete', questions: [] },
      { title: 'Valid', questions: [GOOD] },
    ]);
    const first = await geminiService.generateQuiz('Biology', 'Contract retry', '', 1, false);
    const cached = await geminiService.generateQuiz('Biology', 'Contract retry', '', 1, false);
    expect(first.questions).toHaveLength(1);
    expect(first._validation).toEqual({ version: 1, source: 'gemini' });
    expect(cached).toEqual(first);
    expect(model.generateContent).toHaveBeenCalledTimes(2);
  });

  it('reports a typed failure after two invalid responses', async () => {
    model = fakeModel([
      'not-json',
      { title: 'Duplicate', questions: [GOOD, GOOD] },
    ]);
    await expect(geminiService.generateQuiz('Biology', 'Contract failure', '', 2, true))
      .rejects.toMatchObject({ code: 'AI_QUIZ_INVALID', status: 502 });
    expect(model.generateContent).toHaveBeenCalledTimes(2);
  });
});
