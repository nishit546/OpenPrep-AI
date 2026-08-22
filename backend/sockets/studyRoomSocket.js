/**
 * @fileoverview Socket.IO event handlers for the Collaborative Study Room.
 * Manages room joining, whiteboard stroke synchronization, and real-time chat.
 */

// Track active client socket IDs per roomId
const activeRooms = new Map();

/**
 * Initializes Socket.IO event listeners for study room features.
 * 
 * @param {Object} io - The Socket.IO server instance.
 */
const initializeStudyRoomSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        /**
         * Cleans up room membership state and removes event listeners
         * from a client socket to prevent memory and listener leaks.
         */
        const cleanupSocket = (socketId) => {
            const roomId = socket.data.roomId;
            if (roomId && activeRooms.has(roomId)) {
                const roomUsers = activeRooms.get(roomId);
                roomUsers.delete(socketId);
                if (roomUsers.size === 0) {
                    activeRooms.delete(roomId);
                }
            }

            // Clean up custom event listeners to prevent listener leaks
            socket.removeAllListeners('join_room');
            socket.removeAllListeners('draw_stroke');
            socket.removeAllListeners('clear_whiteboard');
            socket.removeAllListeners('send_chat_message');
            socket.removeAllListeners('study:room:join');
            socket.removeAllListeners('study:room:leave');
            socket.removeAllListeners('study:room:heartbeat');
            socket.removeAllListeners('disconnect');

            // Clear heartbeat interval if running
            if (socket.heartbeatInterval) {
                clearInterval(socket.heartbeatInterval);
                socket.heartbeatInterval = null;
            }
        };

        const handleJoinRoom = ({ roomId, username }) => {
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.username = username;

            if (!activeRooms.has(roomId)) {
                activeRooms.set(roomId, new Set());
            }
            activeRooms.get(roomId).add(socket.id);

            // Notify others in the room
            socket.to(roomId).emit('user_joined', {
                username,
                userId: socket.id,
                message: `${username} has joined the study room.`
            });

            // Send current room state
            socket.emit('room_state_sync', {
                users: Array.from(activeRooms.get(roomId) || []).map(id => ({
                    id,
                    username: io.sockets.sockets.get(id)?.data?.username || 'Anonymous'
                }))
            });

            console.log(`[Socket] User ${username} joined room ${roomId}`);
        };

        const handleLeaveRoom = () => {
            const roomId = socket.data.roomId;
            const username = socket.data.username;

            if (roomId) {
                socket.leave(roomId);
                if (username) {
                    socket.to(roomId).emit('user_left', {
                        username,
                        message: `${username} has left the study room.`
                    });
                }
                cleanupSocket(socket.id);
            }
        };

        /**
         * Event: User joins a specific study room.
         * Payload: { roomId, username }
         */
        socket.on('join_room', handleJoinRoom);
        socket.on('study:room:join', handleJoinRoom);

        /**
         * Event: Broadcast a whiteboard drawing stroke to the room.
         * Payload: { roomId, strokeData: { x, y, color, width, tool, isEraser } }
         */
        socket.on('draw_stroke', ({ roomId, strokeData }) => {
            if (!roomId || !strokeData || typeof strokeData.x !== 'number') {
                return;
            }
            socket.to(roomId).emit('receive_stroke', {
                userId: socket.id,
                strokeData,
            });
        });

        /**
         * Event: Clear the whiteboard for all users in the room.
         * Payload: { roomId }
         */
        socket.on('clear_whiteboard', ({ roomId }) => {
            socket.to(roomId).emit('whiteboard_cleared');
        });

        /**
         * Event: Send a chat message to the room.
         * Payload: { roomId, username, message, timestamp }
         */
        socket.on('send_chat_message', ({ roomId, username, message, timestamp }) => {
            if (!roomId || !message.trim()) return;

            const chatPayload = {
                id: Date.now().toString(),
                userId: socket.id,
                username,
                message: message.trim(),
                timestamp,
            };
            io.to(roomId).emit('receive_chat_message', chatPayload);
        });

        /**
         * Event: Heartbeat checks for socket connectivity
         */
        socket.on('study:room:heartbeat', () => {
            socket.emit('study:room:heartbeat_ack');
        });

        /**
         * Event: Explicit study room leave
         */
        socket.on('study:room:leave', handleLeaveRoom);

        /**
         * Event: User disconnects or leaves the room.
         */
        socket.on('disconnect', () => {
            const roomId = socket.data.roomId;
            const username = socket.data.username;

            if (roomId && username) {
                socket.to(roomId).emit('user_left', {
                    username,
                    message: `${username} has left the study room.`
                });
            }
            cleanupSocket(socket.id);
            console.log(`[Socket] User disconnected: ${socket.id}`);
        });
    });
};

module.exports = initializeStudyRoomSockets;
module.exports.activeRooms = activeRooms;
