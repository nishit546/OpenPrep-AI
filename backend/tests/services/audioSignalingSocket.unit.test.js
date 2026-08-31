const { init, getParticipants } = require('../../services/audioSignalingSocket');
const { User } = require('../../models');

// Simple mocks for socket.io
class MockSocket {
  constructor(id, userId) {
    this.id = id;
    this.user = { id: userId };
    this.rooms = new Set();
    this.emitted = {};
    this.broadcast = {
      to: (room) => ({
        emit: (event, data) => {
          this.broadcastEmits.push({ room, event, data });
        }
      })
    };
    this.broadcastEmits = [];
  }

  join(room) {
    this.rooms.add(room);
  }

  leave(room) {
    this.rooms.delete(room);
  }

  emit(event, data) {
    this.emitted[event] = data;
  }

  to(room) {
    return {
      emit: (event, data) => {
        this.broadcastEmits.push({ room, event, data });
      }
    };
  }

  // Helper to simulate receiving events on socket
  simulateEvent(event, data) {
    if (this.listeners[event]) {
      this.listeners[event](data);
    }
  }

  on(event, callback) {
    if (!this.listeners) this.listeners = {};
    this.listeners[event] = callback;
  }
}

class MockIO {
  constructor() {
    this.listeners = {};
    this.emittedToSocket = {};
  }

  on(event, callback) {
    this.listeners[event] = callback;
  }

  to(socketId) {
    return {
      emit: (event, data) => {
        this.emittedToSocket[event] = { socketId, data };
      }
    };
  }

  simulateConnection(socket) {
    if (this.listeners['connection']) {
      this.listeners['connection'](socket);
    }
  }
}

describe('WebRTC Audio Signaling Socket Services', () => {
  let io;
  let socketA;
  let socketB;

  beforeEach(() => {
    io = new MockIO();
    init(io);
    socketA = new MockSocket('socket_a', 'user_1');
    socketB = new MockSocket('socket_b', 'user_2');
    
    // Reset active lounges roster state
    const activeLounges = require('../../services/audioSignalingSocket');
    // Using a hack to clear state (we can just trigger leave for active users)
    socketA.simulateEvent = (event, data) => socketA.listeners[event] && socketA.listeners[event](data);
    socketB.simulateEvent = (event, data) => socketB.listeners[event] && socketB.listeners[event](data);
  });

  it('allows a socket client to join audio lounge and broadcasts presence', async () => {
    // Mock user DB lookup
    const originalFindByPk = User.findByPk;
    User.findByPk = vi.fn().mockResolvedValue({ id: 'user_1', name: 'Alice', avatar: 'alice.jpg' });

    io.simulateConnection(socketA);
    
    await socketA.simulateEvent('join_audio_lounge', { squadId: 'squad_123' });

    const participants = getParticipants('squad_123');
    expect(participants.length).toBe(1);
    expect(participants[0].userId).toBe('user_1');
    expect(participants[0].name).toBe('Alice');
    expect(socketA.rooms.has('squad:squad_123:audio')).toBe(true);
    expect(socketA.emitted['lounge_peers']).toBeDefined();

    User.findByPk = originalFindByPk;
  });

  it('enforces a hard capacity limit of 8 concurrent peers per lounge', async () => {
    const originalFindByPk = User.findByPk;
    User.findByPk = vi.fn().mockResolvedValue({ id: 'some_user', name: 'Bob' });

    io.simulateConnection(socketA);

    // Populate room with 8 dummy peers
    const participants = getParticipants('squad_full');
    for (let i = 0; i < 8; i++) {
      participants.push({ socketId: `dummy_${i}`, userId: `user_${i}` });
    }

    await socketA.simulateEvent('join_audio_lounge', { squadId: 'squad_full' });

    // Expect room not to increase and emit full message
    expect(getParticipants('squad_full').length).toBe(8);
    expect(socketA.emitted['audio_lounge_full']).toBeDefined();

    // Cleanup
    participants.length = 0;
    User.findByPk = originalFindByPk;
  });

  it('relays SDP packets and ICE candidates between peers', () => {
    io.simulateConnection(socketA);
    
    // Relay SDP Offer
    socketA.simulateEvent('relay_sdp', { targetSocketId: 'socket_b', sdp: { type: 'offer', sdp: '...' } });
    expect(io.emittedToSocket['sdp_received']).toEqual({
      socketId: 'socket_b',
      data: { senderSocketId: 'socket_a', sdp: { type: 'offer', sdp: '...' } }
    });

    // Relay ICE Candidate
    socketA.simulateEvent('relay_ice', { targetSocketId: 'socket_b', iceCandidate: { candidate: '...' } });
    expect(io.emittedToSocket['ice_received']).toEqual({
      socketId: 'socket_b',
      data: { senderSocketId: 'socket_a', iceCandidate: { candidate: '...' } }
    });
  });

  it('removes client from roster and broadcasts peer_left on disconnect', async () => {
    const originalFindByPk = User.findByPk;
    User.findByPk = vi.fn().mockResolvedValue({ id: 'user_1', name: 'Alice' });

    io.simulateConnection(socketA);
    await socketA.simulateEvent('join_audio_lounge', { squadId: 'squad_test' });

    expect(getParticipants('squad_test').length).toBe(1);

    // Simulate disconnect
    socketA.simulateEvent('disconnect');
    expect(getParticipants('squad_test')).toBeUndefined(); // Room deleted since empty

    User.findByPk = originalFindByPk;
  });
});
