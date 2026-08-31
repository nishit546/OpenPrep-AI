const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const codeRoomSocketService = require('../../services/codeRoomSocketService');
const { CodeRoom } = require('../../models');

describe('Code Room WebSocket Service Integration Tests', () => {
  let io, server, socket, clientSocket;
  let createdRoom;

  beforeAll((done) => {
    server = createServer();
    io = new Server(server);
    codeRoomSocketService(io);

    // Mock authentication middleware locally for socket tests
    io.use((socket, next) => {
      socket.user = { id: 'test_user_id' };
      next();
    });

    server.listen(() => {
      const port = server.address().port;
      clientSocket = new Client(`http://localhost:${port}`, {
        auth: {
          token: 'dummy_token',
        },
      });
      clientSocket.on('connect', done);
    });
  });

  beforeEach(async () => {
    createdRoom = await CodeRoom.create({
      title: 'WebSocket Live Sync Test',
      inviteCode: 'ws-test',
      userId: 'test_user_id',
      code: "console.log('original');",
    });
  });

  afterEach(async () => {
    await createdRoom.destroy();
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    server.close();
  });

  it('allows joining collaborative rooms and triggers sync state transmission', (done) => {
    clientSocket.emit('code-join-room', { roomId: createdRoom.id });

    clientSocket.once('code-sync-step-1', (base64Update) => {
      expect(base64Update).toBeDefined();
      expect(typeof base64Update).toBe('string');
      done();
    });
  });

  it('broadcasts awareness updates (cursors/locks) to peers in the same room', (done) => {
    const port = server.address().port;
    const clientSocket2 = new Client(`http://localhost:${port}`, {
      auth: { token: 'dummy_token2' },
    });

    clientSocket2.on('connect', () => {
      clientSocket.emit('code-join-room', { roomId: createdRoom.id });
      clientSocket2.emit('code-join-room', { roomId: createdRoom.id });

      clientSocket2.once('code-sync-step-1', () => {
        // Send cursor update
        clientSocket.emit('code-awareness', {
          roomId: createdRoom.id,
          payload: { socketId: 's1', user: { name: 'Coder' }, cursor: { line: 5 } },
        });
      });

      clientSocket2.once('code-awareness', (payload) => {
        expect(payload.socketId).toBe('s1');
        expect(payload.cursor.line).toBe(5);
        clientSocket2.close();
        done();
      });
    });
  });
});
