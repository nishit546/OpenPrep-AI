const setupQuizBattleSocket = require('../../sockets/quizBattleSocket');
const quizBattleService = require('../../services/quizBattleService');
const Quiz = require('../../models/Quiz');

describe('ranked battle answer timing', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('acknowledges an answer without revealing correctness or the key', async () => {
    const listeners = {};
    const direct = [];
    const socket = {
      id: 'socket-a',
      on: vi.fn((name, handler) => { listeners[name] = handler; }),
      emit: vi.fn((name, payload) => direct.push({ name, payload })),
    };
    const broadcasts = [];
    const io = {
      on: vi.fn((name, handler) => { if (name === 'connection') handler(socket); }),
      to: vi.fn((id) => ({ emit: (name, payload) => broadcasts.push({ id, name, payload }) })),
    };
    vi.spyOn(quizBattleService, 'submitAnswer').mockReturnValue({
      success: true,
      isCorrect: true,
      pointsEarned: 150,
      correctAnswerIndex: 1,
      explanation: 'Secret',
      player: { score: 150, hp: 100 },
      opponent: { socketId: 'socket-b', score: 0, hp: 80 },
      bothAnswered: false,
    });
    setupQuizBattleSocket(io);

    await listeners['battle:answer_submitted']({
      roomId: 'ranked-1', questionIndex: 0, selectedOption: 1,
    });

    expect(direct).toEqual([{
      name: 'battle:answer_ack', payload: { accepted: true, questionIndex: 0 },
    }]);
    expect(broadcasts).toEqual([{
      id: 'socket-b', name: 'battle:opponent_progress',
      payload: { opponentLockedIn: true, questionIndex: 0 },
    }]);
  });

  it('keeps custom-room keys private and ignores client-claimed correctness', async () => {
    vi.useFakeTimers();
    const listeners = {};
    const direct = [];
    const broadcasts = [];
    const socket = {
      id: 'socket-host',
      join: vi.fn(),
      on: vi.fn((name, handler) => { listeners[name] = handler; }),
      emit: vi.fn((name, payload) => direct.push({ name, payload })),
    };
    const io = {
      on: vi.fn((name, handler) => { if (name === 'connection') handler(socket); }),
      to: vi.fn((id) => ({ emit: (name, payload) => broadcasts.push({ id, name, payload }) })),
    };
    vi.spyOn(Quiz, 'findByPk').mockResolvedValue({
      questions: [{ questionText: 'A?', options: ['wrong', 'right'], correctAnswer: 1 }],
    });
    setupQuizBattleSocket(io);

    await listeners['create-room']({ hostName: 'Host', quizId: 'quiz-1' });
    const created = direct.find((event) => event.name === 'room-created').payload;
    expect(JSON.stringify(created)).not.toContain('correctAnswer');
    listeners['start-battle']({ roomCode: created.roomCode });
    vi.advanceTimersByTime(6000);
    listeners['submit-answer']({ roomCode: created.roomCode, isCorrect: true, selectedOption: 0, timeRemaining: 30 });
    const board = broadcasts.find((event) => event.name === 'live-leaderboard').payload.leaderboard;
    expect(board[0].score).toBe(0);
    vi.useRealTimers();
  });
});
