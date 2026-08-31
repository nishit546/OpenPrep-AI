const Note = require('../../models/Note');
const Question = require('../../models/Question');
const llmService = require('../../utils/llmService');
const { generateQuestions } = require('../../controllers/aiController');

describe('AI Controller - Cross-user context isolation (generateQuestions)', () => {
  let req, res, next;

  beforeEach(() => {
    vi.restoreAllMocks();
    req = {
      user: { id: 'user-attacker' },
      body: { noteId: 'note-belongs-to-victim' },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  test('rejects generating questions from a note owned by another user', async () => {
    vi.spyOn(Note, 'findByPk').mockResolvedValue({
      id: 'note-belongs-to-victim',
      user: 'user-victim',
      title: "Victim's private notes",
      content: 'Confidential exam prep content belonging to another user.',
    });
    const llmSpy = vi.spyOn(llmService, 'generateQuestionsFromContent');
    const dbSpy = vi.spyOn(Question, 'bulkCreate');

    await generateQuestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(llmSpy).not.toHaveBeenCalled();
    expect(dbSpy).not.toHaveBeenCalled();
  });

  test('allows generating questions from a note owned by the requesting user', async () => {
    vi.spyOn(Note, 'findByPk').mockResolvedValue({
      id: 'note-belongs-to-victim',
      user: 'user-attacker',
      title: 'My own notes',
      content: 'My own study content.',
    });
    vi.spyOn(llmService, 'generateQuestionsFromContent').mockResolvedValue([
      { question: 'Q?', answer: 'A.', options: [], type: 'short_answer', difficulty: 'easy' },
    ]);
    vi.spyOn(Question, 'bulkCreate').mockResolvedValue([{ id: 'q-1' }]);

    await generateQuestions(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});