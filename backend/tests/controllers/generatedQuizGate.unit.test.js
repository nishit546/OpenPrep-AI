const controller = require('../../controllers/quizController');
const Subject = require('../../models/Subject');
const Note = require('../../models/Note');
const Quiz = require('../../models/Quiz');
const QuizAttempt = require('../../models/QuizAttempt');
const geminiService = require('../../services/geminiService');
const cacheService = require('../../services/cacheService');

describe('AI quiz persistence gate', () => {
  beforeEach(() => {
    vi.spyOn(Subject, 'findByPk').mockResolvedValue({ name: 'Biology' });
    vi.spyOn(Note, 'findAll').mockResolvedValue([]);
    vi.spyOn(Quiz, 'findAll').mockResolvedValue([]);
    vi.spyOn(QuizAttempt, 'findAll').mockResolvedValue([]);
    vi.spyOn(Quiz, 'create').mockResolvedValue({ id: 'quiz-1' });
    vi.spyOn(cacheService, 'getWithMetadata').mockResolvedValue({ isHit: false, data: null });
    vi.spyOn(cacheService, 'set').mockResolvedValue(undefined);
    vi.spyOn(cacheService, 'del').mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  async function requestWith(generated) {
    vi.spyOn(geminiService, 'generateQuiz').mockResolvedValue(generated);
    const req = {
      body: { subjectId: 'subject-1', count: 1, questionType: 'MCQ' },
      query: {}, user: { id: 'user-1' },
    };
    const res = {
      status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };
    const next = vi.fn();
    await controller.generateAIQuiz(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(Quiz.create).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
    return res;
  }

  it('does not persist a sample quiz when the AI provider is unavailable', async () => {
    const res = await requestWith({ _mock: true, title: 'Sample', questions: [] });
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('does not persist malformed model output', async () => {
    const res = await requestWith({
      title: 'Incomplete', questions: [], _validation: { version: 1, source: 'gemini' },
    });
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('evicts an unvalidated cache hit before retrying generation', async () => {
    cacheService.getWithMetadata.mockResolvedValue({ isHit: true, data: { title: 'Stale', questions: [] } });
    await requestWith({ _mock: true, title: 'Sample', questions: [] });
    expect(cacheService.del).toHaveBeenCalledOnce();
    expect(geminiService.generateQuiz).toHaveBeenCalledOnce();
  });
});
