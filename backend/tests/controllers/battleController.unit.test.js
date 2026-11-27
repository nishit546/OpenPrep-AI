const { createBattleSession, getBattleSession } = require('../../controllers/battleController');
const BattleSession = require('../../models/BattleSession');
const BattleParticipant = require('../../models/BattleParticipant');
const Subject = require('../../models/Subject');
const Quiz = require('../../models/Quiz');
const roomManager = require('../../utils/roomManager');

const quiz = {
  id: 'quiz-1',
  title: 'Biology Battle',
  questions: [{ questionText: 'A cell?', options: ['A', 'B'], correctAnswer: 0, explanation: 'Secret' }],
};
const battle = {
  id: 'battle-1', roomCode: 'PREP99', hostUserId: 'host', quizId: quiz.id,
  subjectId: 'subject-1', questionCount: 1, timePerQuestion: 15,
  status: 'waiting', scores: {},
};
const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe('battle lobby answer privacy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    roomManager.removeRoom('PREP99');
  });

  it('never returns a full quiz or answer key when creating a room', async () => {
    vi.spyOn(Subject, 'findOne').mockResolvedValue({ id: 'subject-1' });
    vi.spyOn(BattleSession, 'findOne').mockResolvedValue(null);
    vi.spyOn(BattleSession, 'create').mockResolvedValue(battle);
    vi.spyOn(Quiz, 'findOne').mockResolvedValue(quiz);
    const res = response();
    const next = vi.fn();

    await createBattleSession({ user: { id: 'host' }, body: { subjectId: 'subject-1' } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data.quiz).toEqual({
      id: 'quiz-1', title: 'Biology Battle', questionCount: 1,
    });
  });

  it('does not create a room against another user\'s subject', async () => {
    vi.spyOn(Subject, 'findOne').mockResolvedValue(null);
    const create = vi.spyOn(BattleSession, 'create');
    const res = response();

    await createBattleSession({ user: { id: 'outsider' }, body: { subjectId: 'subject-1' } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(create).not.toHaveBeenCalled();
  });

  it('conceals a room from an authenticated nonparticipant', async () => {
    vi.spyOn(BattleSession, 'findOne').mockResolvedValue(battle);
    const quizLookup = vi.spyOn(Quiz, 'findByPk');
    const res = response();

    await getBattleSession({ user: { id: 'outsider' }, params: { roomCode: 'prep99' } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(quizLookup).not.toHaveBeenCalled();
  });

  it('returns safe metadata to a guest who joined through the socket', async () => {
    vi.spyOn(BattleSession, 'findOne').mockResolvedValue(battle);
    vi.spyOn(BattleParticipant, 'findOne').mockResolvedValue(null);
    vi.spyOn(Quiz, 'findByPk').mockResolvedValue(quiz);
    roomManager.createRoom('PREP99', 'host', { password: 'private' });
    roomManager.addPlayer('PREP99', 'socket-guest', 'guest', 'Guest');
    const res = response();

    await getBattleSession({ user: { id: 'guest' }, params: { roomCode: 'PREP99' } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.quiz).toEqual({
      id: 'quiz-1', title: 'Biology Battle', questionCount: 1,
    });
  });
});
