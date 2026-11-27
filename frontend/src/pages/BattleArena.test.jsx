import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BattleArena from './BattleArena';
import { socket } from '../services/socket';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { triggerConfetti } from '../utils/confetti';

vi.mock('../services/socket', () => ({
  socket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
  },
  connectSocket: vi.fn(),
}));

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [{ _id: 'subj1', name: 'Computer Science', topicCount: 5 }] } }),
    post: vi.fn(),
  },
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({ user: { id: 'user-1', name: 'TestPlayer', eloRating: 1200 } })),
}));

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({})),
  useNavigate: vi.fn(),
}));

vi.mock('../utils/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

const emitHandlers = {};

const captureSocketHandlers = () => {
  socket.on.mockImplementation((event, callback) => {
    emitHandlers[event] = callback;
  });
};

const joinSuccess = {
  success: true,
  roomId: 'ABCDEF',
  room: { id: 'ABCDEF', name: 'Battle Room', password: '' },
  isPrivate: false,
};

describe('BattleArena Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(emitHandlers).forEach((key) => delete emitHandlers[key]);
    useSelector.mockReturnValue({ user: { id: 'user-1', name: 'TestPlayer', eloRating: 1200 } });
    socket.emit.mockImplementation(() => undefined);
  });

  it('renders the join-by-code landing view when not routed to a room', () => {
    useParams.mockReturnValue({});
    render(<BattleArena />);

    expect(screen.getByText('Battle Arena')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join lobby/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create new lobby/i })).toBeInTheDocument();
    expect(screen.getByText(/1v1 Speed Matchmaking/i)).toBeInTheDocument();
  });

  it('joins a lobby by entering a room code', async () => {
    useParams.mockReturnValue({});
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'join-room' && callback) callback(joinSuccess);
    });

    render(<BattleArena />);

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: 'abcdef' },
    });
    fireEvent.click(screen.getByRole('button', { name: /join lobby/i }));

    await waitFor(() => {
      expect(screen.getByText('ABCDEF')).toBeInTheDocument();
    });

    const joinEmit = socket.emit.mock.calls.find(([event]) => event === 'join-room');
    expect(joinEmit[1].roomId).toBe('ABCDEF');
    expect(joinEmit[1].username).toBe('TestPlayer');
  });

  it('shows an error when the room code is unknown', async () => {
    useParams.mockReturnValue({});
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'join-room' && callback) {
        callback({
          success: false,
          message: 'Room ZZZZZZ not found. Check the code and try again.',
        });
      }
    });

    render(<BattleArena />);

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: 'zzzzzz' },
    });
    fireEvent.click(screen.getByRole('button', { name: /join lobby/i }));

    await waitFor(() => {
      expect(screen.getByText(/Room ZZZZZZ not found/i)).toBeInTheDocument();
    });
  });

  it('creates a lobby from the modal with a server-generated code', async () => {
    useParams.mockReturnValue({});
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'create-room' && callback) {
        callback({
          success: true,
          roomId: 'K8M2PQ',
          room: { id: 'K8M2PQ', name: 'My Room', password: '' },
          isPrivate: false,
        });
      }
    });

    render(<BattleArena />);

    fireEvent.click(screen.getByRole('button', { name: /create new lobby/i }));
    expect(screen.getByText('Create a New Lobby')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('My Battle Room'), {
      target: { value: 'My Room' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => {
      expect(screen.getByText('K8M2PQ')).toBeInTheDocument();
    });

    const createEmit = socket.emit.mock.calls.find(([event]) => event === 'create-room');
    expect(createEmit[1].roomId).toBeUndefined();
    expect(createEmit[1].roomName).toBe('My Room');
  });

  it('shows an error inside the create modal when creation fails', async () => {
    useParams.mockReturnValue({});
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'create-room' && callback) {
        callback({
          success: false,
          message: 'Room code ABCDEF is already in use. Try joining it instead.',
        });
      }
    });

    render(<BattleArena />);
    fireEvent.click(screen.getByRole('button', { name: /create new lobby/i }));
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => {
      expect(screen.getByText(/already in use/i)).toBeInTheDocument();
    });
  });

  it('renders the lobby after joining, then finishes the battle and triggers confetti', async () => {
    useParams.mockReturnValue({ roomId: 'ABCDEF' });
    captureSocketHandlers();
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'join-room' && callback) callback(joinSuccess);
    });

    render(<BattleArena />);

    await waitFor(() => {
      expect(screen.getByText('ABCDEF')).toBeInTheDocument();
    });
    expect(screen.getByText(/Lobby:/i)).toBeInTheDocument();

    emitHandlers.room_update({
      players: {
        'socket-1': { username: 'Player One', score: 0, isReady: true, online: true },
        'socket-2': { username: 'Player Two', score: 0, isReady: true, online: true },
      },
      status: 'finished',
    });

    await waitFor(() => {
      expect(screen.getByText('Battle Finished!')).toBeInTheDocument();
    });
    expect(triggerConfetti).toHaveBeenCalled();
  });

  it('updates the live leaderboard scores during play', async () => {
    useParams.mockReturnValue({ roomId: 'ABCDEF' });
    captureSocketHandlers();
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === 'join-room' && callback) callback(joinSuccess);
    });

    render(<BattleArena />);

    await waitFor(() => {
      expect(screen.getByText(/Lobby:/i)).toBeInTheDocument();
    });

    emitHandlers.room_update({
      players: {
        'socket-1': { username: 'Player One', score: 0, isReady: true, online: true },
        'socket-2': { username: 'Player Two', score: 0, isReady: true, online: true },
      },
      status: 'playing',
    });

    emitHandlers.score_update({
      players: {
        'socket-1': { username: 'Player One', score: 30, isReady: true, online: true },
        'socket-2': { username: 'Player Two', score: 10, isReady: true, online: true },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Live Scores:')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('joins 1v1 matchmaking queue and emits battle:join_queue', () => {
    render(<BattleArena />);
    const matchmakeBtn = screen.getByRole('button', { name: /find match \(ranked 1v1\)/i });
    fireEvent.click(matchmakeBtn);

    expect(socket.emit).toHaveBeenCalledWith(
      'battle:join_queue',
      expect.objectContaining({
        username: 'TestPlayer',
        elo: 1200,
      })
    );
  });

  it('transitions to 1v1 split-screen HUD when battle:matched is received', async () => {
    captureSocketHandlers();
    render(<BattleArena />);

    emitHandlers['battle:matched']({
      roomId: 'BATTLE_ROOM_1',
      self: { userId: 'user-1', username: 'TestPlayer', elo: 1200, hp: 100, score: 0 },
      opponent: { userId: 'user-2', username: 'RivalPlayer', elo: 1250, hp: 100, score: 0 },
      questions: [
        {
          questionText: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
        },
      ],
      totalQuestions: 1,
      timeLimit: 15,
      currentQuestionIndex: 0,
    });

    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      expect(screen.getByText('RivalPlayer')).toBeInTheDocument();
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
    });
  });

  it('submits an answer in 1v1 mode and shows opponent lock indicator when battle:opponent_progress arrives', async () => {
    captureSocketHandlers();
    render(<BattleArena />);

    emitHandlers['battle:matched']({
      roomId: 'BATTLE_ROOM_1',
      self: { userId: 'user-1', username: 'TestPlayer', elo: 1200, hp: 100, score: 0 },
      opponent: { userId: 'user-2', username: 'RivalPlayer', elo: 1250, hp: 100, score: 0 },
      questions: [
        {
          questionText: 'What is the speed of light?',
          options: ['3x10^8 m/s', '100 km/h'],
        },
      ],
      totalQuestions: 1,
      timeLimit: 15,
      currentQuestionIndex: 0,
    });

    await waitFor(() => {
      expect(screen.getByText('What is the speed of light?')).toBeInTheDocument();
    });

    // Opponent locks in answer
    emitHandlers['battle:opponent_progress']({
      opponentLockedIn: true,
      opponentScore: 100,
      opponentHp: 100,
    });

    await waitFor(() => {
      expect(screen.getByText(/Answer Locked!/i)).toBeInTheDocument();
    });

    // User clicks option
    fireEvent.click(screen.getByText('3x10^8 m/s'));
    expect(socket.emit).toHaveBeenCalledWith(
      'battle:answer_submitted',
      expect.objectContaining({
        roomId: 'BATTLE_ROOM_1',
        questionIndex: 0,
        selectedOption: 0,
      })
    );
  });

  it('waits for round resolution before showing the ranked answer key', async () => {
    captureSocketHandlers();
    render(<BattleArena />);
    emitHandlers['battle:matched']({
      roomId: 'BATTLE_ROOM_1',
      self: { userId: 'user-1', username: 'TestPlayer', hp: 100, score: 0 },
      opponent: { userId: 'user-2', username: 'RivalPlayer', hp: 100, score: 0 },
      questions: [{ questionText: 'What is 2 + 2?', options: ['3', '4'] }],
      totalQuestions: 1,
      timeLimit: 15,
      currentQuestionIndex: 0,
    });
    await screen.findByText('What is 2 + 2?');

    emitHandlers['battle:answer_ack']({ accepted: true, questionIndex: 0 });
    expect(screen.queryByText(/Correct! \+/)).not.toBeInTheDocument();

    emitHandlers['battle:question_result']({
      questionIndex: 0,
      correctAnswerIndex: 1,
      explanation: 'Two plus two is four.',
      isCorrect: true,
      pointsEarned: 100,
      score: 100,
      selfHp: 100,
      opponentScore: 0,
      opponentHp: 80,
    });
    expect(await screen.findByText(/Correct! \+100 pts/)).toBeInTheDocument();
  });

  it('displays ELO gain and question review on battle:round_ended', async () => {
    captureSocketHandlers();
    render(<BattleArena />);

    emitHandlers['battle:round_ended']({
      roomId: 'BATTLE_ROOM_1',
      winner: { userId: 'user-1', username: 'TestPlayer', score: 200 },
      players: [
        { userId: 'user-1', username: 'TestPlayer', score: 200, correctCount: 1, oldElo: 1200, newElo: 1216, eloDelta: 16 },
        { userId: 'user-2', username: 'RivalPlayer', score: 0, correctCount: 0, oldElo: 1200, newElo: 1184, eloDelta: -16 },
      ],
      questionBreakdown: [
        { index: 1, questionText: 'Sample Question', correctAnswer: 'Correct Answer', explanation: 'Sample explanation' },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('Victory!')).toBeInTheDocument();
      expect(screen.getByText('+16')).toBeInTheDocument();
      expect(screen.getByText(/Question Review Breakdown/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rematch/i })).toBeInTheDocument();
    });
  });
});
