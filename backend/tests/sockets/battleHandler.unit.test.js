const roomManager = require('../../utils/roomManager');
const User = require('../../models/User');
const BattleSession = require('../../models/BattleSession');
const BattleParticipant = require('../../models/BattleParticipant');

vi.mock('../../models/User');
vi.mock('../../models/BattleSession');
vi.mock('../../models/BattleParticipant');
vi.mock('../../services/gamificationService', () => ({
  awardXP: vi.fn().mockResolvedValue({ xp: 100 }),
}));

const createFakeIo = () => {
  const broadcasts = [];
  const io = {
    broadcasts,
    handlers: {},
    middleware: null,
    use: vi.fn((cb) => {
      io.middleware = cb;
    }),
    on: vi.fn((event, cb) => {
      io.handlers[event] = cb;
    }),
    to: vi.fn((roomId) => ({
      emit: vi.fn((event, data) => {
        broadcasts.push({ roomId, event, data });
      }),
    })),
  };
  return io;
};

const createFakeSocket = (id, username = 'Mock Student') => {
  const emitted = [];
  const handlers = {};
  const socket = {
    id,
    emitted,
    handlers,
    joinedRooms: [],
    handshake: {
      auth: { token: 'mock_jwt_token' },
    },
    user: {
      id: `u-${id}`,
      name: username,
    },
    join: vi.fn((roomId) => {
      socket.joinedRooms.push(roomId);
    }),
    leave: vi.fn((roomId) => {
      socket.joinedRooms = socket.joinedRooms.filter(r => r !== roomId);
    }),
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    emit: vi.fn((event, data) => {
      emitted.push({ event, data });
    }),
  };
  return socket;
};

const setup = () => {
  const io = createFakeIo();
  require('../../sockets/battleHandler')(io);
  const connect = (id, username) => {
    const socket = createFakeSocket(id, username);
    if (io.middleware) {
      io.middleware(socket, () => {});
    }
    io.handlers.connection(socket);
    return socket;
  };
  const invoke = (socket, event, payload) =>
    new Promise((resolve) => {
      if (socket.handlers[event]) {
        socket.handlers[event](payload, resolve);
      } else {
        resolve({ success: false, message: `Handler not registered: ${event}` });
      }
    });
  return { io, connect, invoke };
};

describe('Real-Time Quiz Battle Sockets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The production socket handler uses CommonJS require; vi.mock does not
    // replace Sequelize model methods there. Spy on the shared model instead.
    vi.spyOn(BattleSession, 'findOne').mockResolvedValue(null);
    // Reset roomManager rooms
    for (const key in roomManager.rooms) {
      delete roomManager.rooms[key];
    }
  });

  afterEach(() => vi.restoreAllMocks());

  describe('Connection & Lobby Join Flow', () => {
    it('fails to join if the room does not exist in roomManager and database find returns null', async () => {
      BattleSession.findOne.mockResolvedValue(null);
      const { connect, invoke } = setup();
      const socket = connect('s1');

      const res = await invoke(socket, 'join-room', { roomId: 'PREP99' });
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/not found/);
    });

    it('attempts to load the room configuration and quiz from database if not present in memory', async () => {
      const { connect, invoke } = setup();
      const socket = connect('s1', 'Database Loader User');

      // Mock database calls
      BattleSession.findOne.mockResolvedValue({
        id: 'session-123',
        roomCode: 'PREP55',
        hostUserId: 'host-123',
        roomName: 'DB Biology Room',
        password: '',
        questionCount: 5,
        timePerQuestion: 15,
        status: 'waiting',
        quizRef: {
          id: 'quiz-123',
          title: 'Biology Live Quiz',
          questions: [
            {
              questionText: 'What is a cell?',
              options: ['A unit of life', 'A phone'],
              correctAnswer: 0,
            }
          ],
        },
      });

      const res = await invoke(socket, 'join-room', { roomId: 'PREP55' });
      
      expect(res.success).toBe(true);
      expect(res.room.name).toBe('DB Biology Room');
      expect(socket.joinedRooms).toContain('PREP55');
      
      const memoryRoom = roomManager.getRoom('PREP55');
      expect(memoryRoom).toBeDefined();
      expect(memoryRoom.roomName).toBe('DB Biology Room');
      expect(memoryRoom.quiz.title).toBe('Biology Live Quiz');
    });

    it('successfully joins a waiting room and broadcasts update to peers', async () => {
      // 1. Manually create a room in roomManager
      roomManager.createRoom('PREP99', 'host-user', {
        roomName: 'Biology Match',
        questionCount: 5,
        timePerQuestion: 15,
        quiz: { questions: [{ text: 'Q1' }] },
      });

      const { io, connect, invoke } = setup();
      const socket = connect('s2', 'Peer Learner');

      const res = await invoke(socket, 'join-room', { roomId: 'PREP99' });
      expect(res.success).toBe(true);
      expect(res.room.name).toBe('Biology Match');
      expect(socket.joinedRooms).toContain('PREP99');

      // Verify room_update is broadcasted to the room
      const updates = io.broadcasts.filter(b => b.event === 'room_update');
      expect(updates.length).toBeGreaterThan(0);
      const players = updates[0].data.players;
      expect(players[socket.id].username).toBe('Peer Learner');
    });

    it('rejects joining if password does not match for private rooms', async () => {
      roomManager.createRoom('PREP88', 'host-user', {
        roomName: 'Private Match',
        password: 'securePassword',
      });

      const { connect, invoke } = setup();
      const socket = connect('s3');

      const res = await invoke(socket, 'join-room', { roomId: 'PREP88', password: 'wrongPassword' });
      expect(res.success).toBe(false);
      expect(res.requiresPassword).toBe(true);
    });
  });

  describe('Synchronized Battle Loop', () => {
    it('should calculate points including speed bonus for correct answers', async () => {
      const room = roomManager.createRoom('PREP77', 'host-user', {
        roomName: 'Speed Match',
        timePerQuestion: 20,
        quiz: {
          questions: [
            {
              questionText: 'Q1',
              options: ['A', 'B'],
              correctAnswer: 0,
              explanation: 'Exp',
            }
          ]
        }
      });

      const { connect, invoke } = setup();
      const socket = connect('s4');
      roomManager.addPlayer('PREP77', socket.id, socket.user.id, socket.user.name);

      // Start the game manually by changing status
      room.status = 'playing';
      room.questionActive = true;
      room.timeRemaining = 15; // 75% time remaining

      // Submit correct answer: optionIndex 0
      socket.handlers['submit_answer']({
        roomId: 'PREP77',
        optionIndex: 0,
        timeSpentMs: 5000,
      });

      const player = room.players[socket.id];
      expect(player.correctCount).toBe(1);
      // Base score 100 + speed bonus Math.round(15 / 20 * 50) = 100 + 38 = 138 points
      expect(player.score).toBe(138);
    });
  });

  describe('Player Disconnection & Host Handoffs', () => {
    it('gracefully handles user disconnect without immediate lobby close', () => {
      vi.useFakeTimers();

      const room = roomManager.createRoom('PREP66', 'host-user', {
        roomName: 'Grace Match',
      });

      const { connect } = setup();
      const hostSocket = connect('s5');
      roomManager.addPlayer('PREP66', hostSocket.id, hostSocket.user.id, hostSocket.user.name);

      // Trigger disconnect
      hostSocket.handlers.disconnect();

      // Room should still exist during the 30s grace window
      expect(roomManager.getRoom('PREP66')).toBeTruthy();

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      // Room should be cleaned up now as host was the only player
      expect(roomManager.getRoom('PREP66')).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
