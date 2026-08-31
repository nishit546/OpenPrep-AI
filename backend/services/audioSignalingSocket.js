const { User } = require('../models');
const logger = require('../utils/logger');

// Store active audio lounge rosters: squadId -> Array of participants
const activeLounges = {};

/**
 * Expose participants in a given squad's audio lounge.
 * @param {string} squadId
 * @returns {object[]}
 */
function getParticipants(squadId) {
  return activeLounges[squadId] || [];
}

/**
 * WebSocket signaling gateway for WebRTC Mesh Audio Lounge.
 * @param {object} io - Socket.io server instance
 */
function init(io) {
  io.on('connection', (socket) => {
    
    // When a squad member joins the audio lounge
    socket.on('join_audio_lounge', async ({ squadId }) => {
      try {
        if (!squadId || !socket.user?.id) return;

        // Ensure lounge is initialized
        if (!activeLounges[squadId]) {
          activeLounges[squadId] = [];
        }

        // Hard Limit: Max 8 concurrent peers per lounge
        if (activeLounges[squadId].length >= 8) {
          socket.emit('audio_lounge_full', { message: 'The audio lounge is full (max 8 peers).' });
          return;
        }

        // Clean up any stale participant records for this user/socket
        activeLounges[squadId] = activeLounges[squadId].filter(
          (p) => p.userId !== socket.user.id && p.socketId !== socket.id
        );

        // Fetch user data for name & avatar
        const user = await User.findByPk(socket.user.id);
        const name = user ? user.name : 'Unknown Scholar';
        const avatar = user ? user.avatar : null;

        const participant = {
          socketId: socket.id,
          userId: socket.user.id,
          name,
          avatar,
          muted: false,
          deafened: false,
          speaking: false,
        };

        activeLounges[squadId].push(participant);
        socket.join(`squad:${squadId}:audio`);

        // 1. Send active peers list to new user so they can initiate mesh WebRTC calls
        const peers = activeLounges[squadId].filter((p) => p.socketId !== socket.id);
        socket.emit('lounge_peers', peers);

        // 2. Notify all existing peers in the room about the new participant
        socket.to(`squad:${squadId}:audio`).emit('peer_joined', participant);

        logger.info(`[AudioLounge] User ${name} (${socket.user.id}) joined audio lounge squad:${squadId}`);
      } catch (err) {
        logger.error('[AudioLounge] Error joining audio lounge:', err);
      }
    });

    // Relay SDP Offer/Answer to target peer
    socket.on('relay_sdp', ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit('sdp_received', {
        senderSocketId: socket.id,
        sdp,
      });
    });

    // Relay ICE Candidate to target peer
    socket.on('relay_ice', ({ targetSocketId, iceCandidate }) => {
      io.to(targetSocketId).emit('ice_received', {
        senderSocketId: socket.id,
        iceCandidate,
      });
    });

    // Broadcast local mute/deafen status change
    socket.on('audio_state_change', ({ squadId, muted, deafened }) => {
      if (!squadId || !activeLounges[squadId]) return;

      const participant = activeLounges[squadId].find((p) => p.socketId === socket.id);
      if (participant) {
        participant.muted = !!muted;
        participant.deafened = !!deafened;
        
        socket.to(`squad:${squadId}:audio`).emit('peer_audio_state', {
          socketId: socket.id,
          muted: participant.muted,
          deafened: participant.deafened,
        });
      }
    });

    // Broadcast local speaking status change (VAD)
    socket.on('speaking_state_change', ({ squadId, speaking }) => {
      if (!squadId || !activeLounges[squadId]) return;

      const participant = activeLounges[squadId].find((p) => p.socketId === socket.id);
      if (participant) {
        participant.speaking = !!speaking;
        
        socket.to(`squad:${squadId}:audio`).emit('peer_speaking_state', {
          socketId: socket.id,
          speaking: participant.speaking,
        });
      }
    });

    // Explicit leave audio lounge
    socket.on('leave_audio_lounge', ({ squadId }) => {
      handleLeave(socket, squadId);
    });

    // Handle unexpected socket disconnection
    socket.on('disconnect', () => {
      // Clean up socket from any lounges they were in
      for (const squadId of Object.keys(activeLounges)) {
        const isInLounge = activeLounges[squadId].some((p) => p.socketId === socket.id);
        if (isInLounge) {
          handleLeave(socket, squadId);
        }
      }
    });

  });
}

/**
 * Handle removing a peer from an active room roster.
 * @param {object} socket
 * @param {string} squadId
 */
function handleLeave(socket, squadId) {
  if (!squadId || !activeLounges[squadId]) return;

  const leavingParticipant = activeLounges[squadId].find((p) => p.socketId === socket.id);
  
  activeLounges[squadId] = activeLounges[squadId].filter((p) => p.socketId !== socket.id);
  socket.leave(`squad:${squadId}:audio`);

  if (leavingParticipant) {
    socket.to(`squad:${squadId}:audio`).emit('peer_left', {
      socketId: socket.id,
      userId: leavingParticipant.userId,
    });
    logger.info(`[AudioLounge] User ${leavingParticipant.name} left audio lounge squad:${squadId}`);
  }

  // Clean up empty rooms
  if (activeLounges[squadId].length === 0) {
    delete activeLounges[squadId];
  }
}

module.exports = {
  init,
  getParticipants,
};
