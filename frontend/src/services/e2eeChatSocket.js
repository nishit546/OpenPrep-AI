import { socket, connectSocket } from './socket';

/**
 * Socket service manager for Zero-Knowledge End-to-End Encrypted Group Study Chat
 */
export const e2eeChatSocket = {
  /**
   * Connect and join E2EE Room
   */
  joinRoom(roomId, onPeersUpdate) {
    connectSocket();

    socket.emit('e2ee:join_room', { roomId });

    socket.off('e2ee:room_peers_update');
    socket.on('e2ee:room_peers_update', ({ peers }) => {
      if (onPeersUpdate) onPeersUpdate(peers);
    });
  },

  /**
   * Send encrypted chat message
   */
  sendMessage(roomId, messagePayload) {
    socket.emit('e2ee:send_message', { roomId, messagePayload });
  },

  /**
   * Listen for incoming encrypted messages
   */
  onNewMessage(callback) {
    socket.off('e2ee:new_message');
    socket.on('e2ee:new_message', (msg) => {
      if (callback) callback(msg);
    });
  },

  /**
   * Send encrypted self-destructing ephemeral note
   */
  sendEphemeralNote(roomId, notePayload) {
    socket.emit('e2ee:send_ephemeral_note', { roomId, notePayload });
  },

  /**
   * Listen for incoming encrypted ephemeral notes
   */
  onNewEphemeralNote(callback) {
    socket.off('e2ee:new_ephemeral_note');
    socket.on('e2ee:new_ephemeral_note', (note) => {
      if (callback) callback(note);
    });
  },

  /**
   * Send encrypted media vault payload
   */
  sendMedia(roomId, mediaPayload) {
    socket.emit('e2ee:send_media', { roomId, mediaPayload });
  },

  /**
   * Listen for incoming encrypted media vault payloads
   */
  onNewMedia(callback) {
    socket.off('e2ee:new_media');
    socket.on('e2ee:new_media', (item) => {
      if (callback) callback(item);
    });
  },

  /**
   * Broadcast self-destruction of an ephemeral note
   */
  burnNote(roomId, noteId) {
    socket.emit('e2ee:burn_note', { roomId, noteId });
  },

  /**
   * Listen for note burn notifications
   */
  onNoteBurned(callback) {
    socket.off('e2ee:note_burned');
    socket.on('e2ee:note_burned', ({ noteId }) => {
      if (callback) callback(noteId);
    });
  },

  /**
   * Leave E2EE room
   */
  leaveRoom(roomId) {
    socket.emit('e2ee:leave_room', { roomId });
    socket.off('e2ee:room_peers_update');
    socket.off('e2ee:new_message');
    socket.off('e2ee:new_ephemeral_note');
    socket.off('e2ee:new_media');
    socket.off('e2ee:note_burned');
  },
};

export default e2eeChatSocket;
