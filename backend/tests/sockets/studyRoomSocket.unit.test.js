import { describe, it, expect, vi, beforeEach } from 'vitest';
const initializeStudyRoomSockets = require('../../sockets/studyRoomSocket');
const { activeRooms } = require('../../sockets/studyRoomSocket');

const createFakeIo = () => {
  const broadcasts = [];
  const socketsMap = new Map();
  const io = {
    broadcasts,
    handlers: {},
    sockets: {
      sockets: socketsMap,
      adapter: {
        rooms: {
          get: vi.fn((roomId) => activeRooms.get(roomId) || new Set()),
        },
      },
    },
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

const createFakeSocket = (id) => {
  const emitted = [];
  const handlers = {};
  const socket = {
    id,
    emitted,
    handlers,
    data: {},
    heartbeatInterval: setInterval(() => {}, 1000), // mock interval to verify cleanup
    joinedRooms: [],
    join: vi.fn((roomId) => {
      socket.joinedRooms.push(roomId);
    }),
    leave: vi.fn((roomId) => {
      socket.joinedRooms = socket.joinedRooms.filter((r) => r !== roomId);
    }),
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    emit: vi.fn((event, data) => {
      emitted.push({ event, data });
    }),
    to: vi.fn((roomId) => ({
      emit: vi.fn((event, data) => {
        // mock broadcast
      }),
    })),
    removeAllListeners: vi.fn(),
  };
  return socket;
};

describe('studyRoomSocket unit tests', () => {
  let io;
  let socket;

  beforeEach(() => {
    activeRooms.clear();
    io = createFakeIo();
    socket = createFakeSocket('socket-123');
    initializeStudyRoomSockets(io);
    // Trigger connection
    io.handlers['connection'](socket);
  });

  it('adds user to activeRooms on join_room', () => {
    socket.handlers['join_room']({ roomId: 'room-1', username: 'Alice' });
    expect(activeRooms.has('room-1')).toBe(true);
    expect(activeRooms.get('room-1').has('socket-123')).toBe(true);
  });

  it('removes listeners and heartbeat on disconnect (cleanupSocket)', () => {
    socket.handlers['join_room']({ roomId: 'room-1', username: 'Alice' });
    expect(socket.heartbeatInterval).toBeDefined();

    // Trigger disconnect
    socket.handlers['disconnect']();

    // Verify activeRooms is cleaned up
    expect(activeRooms.has('room-1')).toBe(false);

    // Verify listeners are removed
    expect(socket.removeAllListeners).toHaveBeenCalledWith('join_room');
    expect(socket.removeAllListeners).toHaveBeenCalledWith('draw_stroke');
    expect(socket.removeAllListeners).toHaveBeenCalledWith('clear_whiteboard');
    expect(socket.removeAllListeners).toHaveBeenCalledWith('send_chat_message');
    expect(socket.removeAllListeners).toHaveBeenCalledWith('disconnect');

    // Verify heartbeat interval is cleared
    expect(socket.heartbeatInterval).toBeNull();
  });
});
