const Y = require('yjs');
const { CodeRoom } = require('../models');
const logger = require('../utils/logger');

const PERSIST_DEBOUNCE_MS = 2500;

// Active rooms cache: roomId -> { doc, debouncer, participants: Set<socketId> }
const activeRooms = new Map();

/**
 * Loads a room's document state from the DB, or retrieves the active memory reference.
 */
function getOrCreateRoomDoc(roomId, dbRoom) {
  const existing = activeRooms.get(roomId);
  if (existing) return existing;

  const doc = new Y.Doc();

  if (dbRoom.docState) {
    Y.applyUpdate(doc, new Uint8Array(dbRoom.docState));
  } else if (dbRoom.code) {
    doc.getText('content').insert(0, dbRoom.code);
  }

  const entry = {
    doc,
    debouncer: null,
    participants: new Set(),
  };

  activeRooms.set(roomId, entry);
  return entry;
}

/**
 * Persists current Yjs docState and text to database.
 */
async function persistRoomState(roomId, doc) {
  try {
    const textContent = doc.getText('content').toString();
    const updateBytes = Y.encodeStateAsUpdate(doc);

    await CodeRoom.update(
      {
        docState: Buffer.from(updateBytes),
        code: textContent,
      },
      { where: { id: roomId } }
    );
  } catch (err) {
    logger.error(`[CodeRoomSocket] Failed to persist room state for room ${roomId}:`, err.message);
  }
}

/**
 * Releases room document from memory if empty.
 */
async function releaseRoomDoc(roomId, socketId) {
  const entry = activeRooms.get(roomId);
  if (!entry) return;

  entry.participants.delete(socketId);
  if (entry.participants.size > 0) return;

  // Flush any pending database writes before release
  if (entry.debouncer) {
    clearTimeout(entry.debouncer);
    entry.debouncer = null;
    await persistRoomState(roomId, entry.doc);
  }

  entry.doc.destroy();
  activeRooms.delete(roomId);
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Tracks roomId -> boolean for authorization check speed
    const roomGrants = new Map();

    const denyJoin = (roomId, reason) => {
      logger.warn('[CodeRoomSocket] Join denied:', { roomId, userId: socket.user?.id, reason });
      socket.emit('code-error', { roomId, message: 'Access denied or invalid session room.' });
    };

    socket.on('code-join-room', async ({ roomId } = {}) => {
      if (!roomId) return;

      const userId = socket.user?.id;
      if (!userId) return denyJoin(roomId, 'unauthenticated socket');

      try {
        const dbRoom = await CodeRoom.findByPk(roomId);
        if (!dbRoom) {
          return denyJoin(roomId, 'room not found');
        }

        roomGrants.set(roomId, true);
        socket.join(`code-room:${roomId}`);

        const entry = getOrCreateRoomDoc(roomId, dbRoom);
        entry.participants.add(socket.id);

        // Sync first Yjs state update back to client
        socket.emit(
          'code-sync-step-1',
          Buffer.from(Y.encodeStateAsUpdate(entry.doc)).toString('base64')
        );

        logger.info(`[CodeRoomSocket] User ${userId} joined room ${roomId}`);
      } catch (err) {
        logger.error('[CodeRoomSocket] Load failed:', err.message);
        socket.emit('code-error', { roomId, message: 'Could not load collaborative room.' });
      }
    });

    socket.on('code-update', ({ roomId, payload } = {}) => {
      if (!roomId || !payload) return;

      if (!roomGrants.has(roomId)) {
        return logger.warn('[CodeRoomSocket] Unauthorized update rejected:', { roomId, userId: socket.user?.id });
      }

      const entry = activeRooms.get(roomId);
      if (!entry) return;

      try {
        Y.applyUpdate(entry.doc, new Uint8Array(Buffer.from(payload, 'base64')));

        // Broadcast code sync update to other peers in room
        socket.to(`code-room:${roomId}`).emit('code-update', payload);

        // Debounce database write to prevent DB spam
        if (entry.debouncer) clearTimeout(entry.debouncer);
        entry.debouncer = setTimeout(() => {
          entry.debouncer = null;
          persistRoomState(roomId, entry.doc);
        }, PERSIST_DEBOUNCE_MS);
      } catch (err) {
        logger.error('[CodeRoomSocket] Failed to apply update:', err.message);
      }
    });

    socket.on('code-awareness', ({ roomId, payload } = {}) => {
      if (!roomId || !payload) return;
      if (!roomGrants.has(roomId)) return;

      // Forward active cursors/names/locks state to peers in room
      socket.to(`code-room:${roomId}`).emit('code-awareness', payload);
    });

    socket.on('code-leave-room', async ({ roomId } = {}) => {
      if (!roomId || !roomGrants.has(roomId)) return;

      roomGrants.delete(roomId);
      socket.leave(`code-room:${roomId}`);
      await releaseRoomDoc(roomId, socket.id);
    });

    socket.on('disconnect', async () => {
      const activeKeys = [...roomGrants.keys()];
      roomGrants.clear();

      for (const roomId of activeKeys) {
        await releaseRoomDoc(roomId, socket.id);
      }
    });
  });
};
