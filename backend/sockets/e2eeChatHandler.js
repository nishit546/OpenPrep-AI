/**
 * @fileoverview Socket.IO handler for Zero-Knowledge End-to-End Encrypted (E2EE) Group Study Chat.
 * Relays ONLY encrypted ciphertext payloads (AES-GCM-256) between study group peers.
 */
const logger = require('../utils/logger');

const e2eeRooms = {};

const displayName = (socket) => socket.user?.name || socket.user?.email || 'Anonymous Peer';

module.exports = (io) => {
  io.on('connection', (socket) => {
    logger.debug('E2EE chat socket connected', { socketId: socket.id, userId: socket.user?.id });

    // 1. Join E2EE Study Room
    socket.on('e2ee:join_room', ({ roomId }) => {
      if (!roomId) return;
      const targetRoom = `e2ee-room-${roomId}`;
      socket.join(targetRoom);

      if (!e2eeRooms[targetRoom]) {
        e2eeRooms[targetRoom] = {
          peers: {},
        };
      }

      const userName = displayName(socket);
      e2eeRooms[targetRoom].peers[socket.id] = {
        socketId: socket.id,
        userId: socket.user?.id || 'anon',
        name: userName,
      };

      // Broadcast active E2EE room peers
      io.to(targetRoom).emit('e2ee:room_peers_update', {
        peers: Object.values(e2eeRooms[targetRoom].peers),
      });

      logger.debug('User joined E2EE study room', { roomId, userId: socket.user?.id });
    });

    // 2. Relay Encrypted Message (Zero-Knowledge)
    socket.on('e2ee:send_message', ({ roomId, messagePayload }) => {
      if (!roomId || !messagePayload || !messagePayload.ciphertext || !messagePayload.iv) return;

      const targetRoom = `e2ee-room-${roomId}`;
      if (!e2eeRooms[targetRoom] || !e2eeRooms[targetRoom].peers[socket.id]) return;

      const relayPayload = {
        id: messagePayload.id || Math.random().toString(36).substring(2, 9),
        sender: e2eeRooms[targetRoom].peers[socket.id].name,
        senderId: socket.user?.id || 'anon',
        ciphertext: messagePayload.ciphertext,
        iv: messagePayload.iv,
        timestamp: new Date().toISOString(),
      };

      io.to(targetRoom).emit('e2ee:new_message', relayPayload);
    });

    // 3. Relay Encrypted Ephemeral Note (Self-Destructing)
    socket.on('e2ee:send_ephemeral_note', ({ roomId, notePayload }) => {
      if (!roomId || !notePayload || !notePayload.ciphertext || !notePayload.iv) return;

      const targetRoom = `e2ee-room-${roomId}`;
      if (!e2eeRooms[targetRoom] || !e2eeRooms[targetRoom].peers[socket.id]) return;

      const ttlSeconds = Number(notePayload.ttlSeconds) || 300;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      const relayNote = {
        id: notePayload.id || Math.random().toString(36).substring(2, 9),
        sender: e2eeRooms[targetRoom].peers[socket.id].name,
        senderId: socket.user?.id || 'anon',
        ciphertext: notePayload.ciphertext,
        iv: notePayload.iv,
        titleCiphertext: notePayload.titleCiphertext || null,
        titleIv: notePayload.titleIv || null,
        ttlSeconds,
        burnOnRead: !!notePayload.burnOnRead,
        expiresAt,
        timestamp: new Date().toISOString(),
      };

      io.to(targetRoom).emit('e2ee:new_ephemeral_note', relayNote);
    });

    // 4. Relay Encrypted Media Vault Item
    socket.on('e2ee:send_media', ({ roomId, mediaPayload }) => {
      if (!roomId || !mediaPayload || !mediaPayload.encryptedData || !mediaPayload.iv) return;

      const targetRoom = `e2ee-room-${roomId}`;
      if (!e2eeRooms[targetRoom] || !e2eeRooms[targetRoom].peers[socket.id]) return;

      const relayMedia = {
        id: mediaPayload.id || Math.random().toString(36).substring(2, 9),
        sender: e2eeRooms[targetRoom].peers[socket.id].name,
        senderId: socket.user?.id || 'anon',
        encryptedData: mediaPayload.encryptedData,
        iv: mediaPayload.iv,
        mimeType: mediaPayload.mimeType || 'application/octet-stream',
        fileName: mediaPayload.fileName || 'encrypted_vault_media',
        fileSize: mediaPayload.fileSize || 0,
        timestamp: new Date().toISOString(),
      };

      io.to(targetRoom).emit('e2ee:new_media', relayMedia);
    });

    // 5. Ephemeral Note Self-Destruction / Burn Event
    socket.on('e2ee:burn_note', ({ roomId, noteId }) => {
      if (!roomId || !noteId) return;
      const targetRoom = `e2ee-room-${roomId}`;
      io.to(targetRoom).emit('e2ee:note_burned', { noteId });
    });

    // 6. Leave E2EE Room
    socket.on('e2ee:leave_room', ({ roomId }) => {
      if (!roomId) return;
      const targetRoom = `e2ee-room-${roomId}`;
      socket.leave(targetRoom);

      if (e2eeRooms[targetRoom] && e2eeRooms[targetRoom].peers[socket.id]) {
        delete e2eeRooms[targetRoom].peers[socket.id];
        io.to(targetRoom).emit('e2ee:room_peers_update', {
          peers: Object.values(e2eeRooms[targetRoom].peers),
        });

        if (Object.keys(e2eeRooms[targetRoom].peers).length === 0) {
          delete e2eeRooms[targetRoom];
        }
      }
    });

    // Handle Socket Disconnect
    socket.on('disconnect', () => {
      for (const targetRoom in e2eeRooms) {
        if (e2eeRooms[targetRoom].peers[socket.id]) {
          delete e2eeRooms[targetRoom].peers[socket.id];
          io.to(targetRoom).emit('e2ee:room_peers_update', {
            peers: Object.values(e2eeRooms[targetRoom].peers),
          });

          if (Object.keys(e2eeRooms[targetRoom].peers).length === 0) {
            delete e2eeRooms[targetRoom];
          }
          break;
        }
      }
    });
  });
};
