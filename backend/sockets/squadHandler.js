const { SquadMember } = require('../models');

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_squad_room', async ({ squadId }) => {
      try {
        if (!squadId || !socket.user?.id) return;
        const member = await SquadMember.findOne({ where: { squadId, userId: socket.user.id } });
        if (!member) return;
        socket.join(`squad:${squadId}`);
        socket.squadId = squadId;
        
        // Notify others
        io.to(`squad:${squadId}`).emit('squad:member_status', {
          userId: socket.user.id,
          status: 'online'
        });
      } catch (err) {
        console.error('Error joining squad room:', err);
      }
    });

    socket.on('squad:set_status', ({ status }) => {
      if (socket.squadId && socket.user?.id) {
        io.to(`squad:${socket.squadId}`).emit('squad:member_status', {
          userId: socket.user.id,
          status
        });
      }
    });

    socket.on('leave_squad_room', ({ squadId }) => {
      if (!squadId) return;
      socket.leave(`squad:${squadId}`);
      if (socket.user?.id) {
        io.to(`squad:${squadId}`).emit('squad:member_status', {
          userId: socket.user.id,
          status: 'offline'
        });
      }
    });

    socket.on('disconnect', () => {
      if (socket.squadId && socket.user?.id) {
        io.to(`squad:${socket.squadId}`).emit('squad:member_status', {
          userId: socket.user.id,
          status: 'offline'
        });
      }
    });
  });
};