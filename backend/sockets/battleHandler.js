const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BattleSession = require('../models/BattleSession');
const BattleParticipant = require('../models/BattleParticipant');
const Quiz = require('../models/Quiz');
const roomManager = require('../utils/roomManager');
const { awardXP } = require('../services/gamificationService');

module.exports = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token is required.'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new Error('User not found.'));
      }
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication failed. Invalid token.'));
    }
  });

  const runBattleLoop = (roomCode) => {
    const room = roomManager.getRoom(roomCode);
    if (!room || room.status !== 'playing') return;

    const questions = room.quiz?.questions || [];
    if (questions.length === 0) {
      finishBattle(roomCode);
      return;
    }

    sendQuestion(roomCode, room.currentQuestionIndex);
  };

  const sendQuestion = (roomCode, questionIndex) => {
    const room = roomManager.getRoom(roomCode);
    if (!room || room.status !== 'playing') return;

    const questions = room.quiz?.questions || [];
    if (questionIndex >= questions.length) {
      finishBattle(roomCode);
      return;
    }

    const currentQuestion = questions[questionIndex];
    room.currentQuestionIndex = questionIndex;
    room.questionActive = true;
    room.timeRemaining = room.timePerQuestion;
    room.answersReceived = 0;

    // Reset player answers for this question
    for (const socketId in room.players) {
      room.players[socketId].answeredThisQuestion = false;
      room.players[socketId].timeSpentMs = 0;
    }

    io.to(roomCode).emit('new_question', {
      questionIndex,
      questionText: currentQuestion.questionText,
      options: currentQuestion.options,
      totalQuestions: questions.length,
      timeLimit: room.timePerQuestion,
    });

    // Start countdown timer
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
      room.timeRemaining -= 1;
      io.to(roomCode).emit('timer_tick', { timeRemaining: room.timeRemaining });

      if (room.timeRemaining <= 0) {
        clearInterval(room.timerInterval);
        revealQuestionResult(roomCode);
      }
    }, 1000);
  };

  const revealQuestionResult = (roomCode) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    room.questionActive = false;
    if (room.timerInterval) clearInterval(room.timerInterval);

    const currentQuestion = room.quiz.questions[room.currentQuestionIndex];
    io.to(roomCode).emit('question_result', {
      correctAnswerIndex: currentQuestion.correctAnswer,
      correctAnswerText: currentQuestion.options[currentQuestion.correctAnswer],
      explanation: currentQuestion.explanation || '',
      players: room.players,
    });

    // Advance to next question after 4 seconds
    setTimeout(() => {
      if (room.status === 'playing') {
        sendQuestion(roomCode, room.currentQuestionIndex + 1);
      }
    }, 4000);
  };

  const finishBattle = async (roomCode) => {
    const lockService = require('../services/lockService');
    const lockValue = await lockService.acquireLock(`battle:finish:${roomCode}`, 10000);
    if (!lockValue) return;

    try {
      const room = roomManager.getRoom(roomCode);
      if (!room || room.status === 'finished') return;

      room.status = 'finished';
    if (room.timerInterval) clearInterval(room.timerInterval);

    try {
      const dbSession = await BattleSession.findOne({ where: { roomCode } });
      if (dbSession) {
        dbSession.status = 'finished';
        
        // Compile scores map
        const finalScores = {};
        const participantsData = [];
        
        // Find winner
        let highestScore = -1;
        let winnerSocketId = null;

        for (const socketId in room.players) {
          const player = room.players[socketId];
          finalScores[player.userId] = player.score;

          if (player.score > highestScore) {
            highestScore = player.score;
            winnerSocketId = socketId;
          }
        }

        dbSession.scores = finalScores;
        await dbSession.save();

        // Create participant logs & award gamification XP
        for (const socketId in room.players) {
          const player = room.players[socketId];
          const questionsCount = room.quiz?.questions?.length || 1;
          const avgTimeMs = player.correctCount > 0 ? (player.timeSpentSumMs / player.correctCount) : 0;

          await BattleParticipant.create({
            battleId: dbSession.id,
            userId: player.userId,
            score: player.score,
            correctCount: player.correctCount,
            avgTimeMs,
          });

          // Award XP: Winner gets 200 XP, others get 100 XP
          const isWinner = socketId === winnerSocketId;
          const xpAmount = isWinner ? 200 : 100;
          await awardXP(player.userId, xpAmount, 'battle_completion');
        }
      }
    } catch (err) {
      console.error('Error saving battle sessions to database:', err);
    }

    io.to(roomCode).emit('battle_finished', {
      players: room.players,
    });

    roomManager.removeRoom(roomCode);
    } finally {
      await lockService.releaseLock(`battle:finish:${roomCode}`, lockValue);
    }
  };

  io.on('connection', (socket) => {
    console.log(`Battle socket connection established: ${socket.id} (user: ${socket.user.name})`);

    socket.on('join-room', async (payload, callback) => {
      const roomCode = (payload?.roomId || '').trim().toUpperCase();
      if (!roomCode) {
        return callback && callback({ success: false, message: 'Room code is required.' });
      }

      let room = roomManager.getRoom(roomCode);
      if (!room) {
        try {
          const dbSession = await BattleSession.findOne({
            where: { roomCode },
            include: [{ model: Quiz, as: 'quizRef' }]
          });

          if (!dbSession || dbSession.status === 'finished') {
            return callback && callback({ success: false, message: 'Lobby room not found.' });
          }

          room = roomManager.createRoom(roomCode, dbSession.hostUserId, {
            roomName: dbSession.roomName,
            password: dbSession.password,
            questionCount: dbSession.questionCount,
            timePerQuestion: dbSession.timePerQuestion,
            quiz: dbSession.quizRef,
          });

          if (!room) {
            return callback && callback({ success: false, message: 'Failed to initialize lobby room.' });
          }
        } catch (err) {
          console.error('Error loading battle session from database:', err);
          return callback && callback({ success: false, message: 'Database error loading room.' });
        }
      }

      if (room.status !== 'waiting') {
        return callback && callback({ success: false, message: 'Battle is already in progress.' });
      }

      if (room.password && room.password !== payload.password) {
        return callback && callback({ success: false, requiresPassword: true, message: 'Invalid password.' });
      }

      socket.join(roomCode);
      roomManager.addPlayer(roomCode, socket.id, socket.user.id, socket.user.name);

      io.to(roomCode).emit('room_update', {
        players: room.players,
        status: room.status,
        hostUserId: room.hostUserId,
      });

      if (callback) {
        callback({
          success: true,
          roomId: roomCode,
          room: {
            id: room.roomCode,
            name: room.roomName,
            hostUserId: room.hostUserId,
            questionCount: room.questionCount,
            timePerQuestion: room.timePerQuestion,
          },
        });
      }
    });

    socket.on('toggle_ready', ({ roomId }) => {
      const roomCode = (roomId || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room || !room.players[socket.id]) return;

      const player = room.players[socket.id];
      player.isReady = !player.isReady;

      io.to(roomCode).emit('room_update', {
        players: room.players,
        status: room.status,
      });

      // Auto start if all players are ready
      if (roomManager.checkAllReady(roomCode) && Object.keys(room.players).length >= 1) {
        room.status = 'playing';
        io.to(roomCode).emit('battle_start');
        runBattleLoop(roomCode);
      }
    });

    socket.on('start-game', ({ roomId }) => {
      const roomCode = (roomId || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      if (room.hostUserId !== socket.user.id) {
        return socket.emit('error', 'Only the room host can start the battle.');
      }

      room.status = 'playing';
      io.to(roomCode).emit('battle_start');
      runBattleLoop(roomCode);
    });

    socket.on('submit_answer', ({ roomId, optionIndex, timeSpentMs = 0 }) => {
      const roomCode = (roomId || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room || room.status !== 'playing' || !room.questionActive) return;

      const player = room.players[socket.id];
      if (!player || player.answeredThisQuestion) return;

      player.answeredThisQuestion = true;
      const currentQuestion = room.quiz.questions[room.currentQuestionIndex];
      const isCorrect = optionIndex === currentQuestion.correctAnswer;

      if (isCorrect) {
        // Base points + speed bonus
        const remainingPercentage = room.timeRemaining / room.timePerQuestion;
        const speedBonus = Math.round(remainingPercentage * 50);
        player.score += (100 + speedBonus);
        player.correctCount += 1;
        player.timeSpentSumMs += timeSpentMs;
      }

      room.answersReceived += 1;

      // Count only online players who haven't disconnected
      const activePlayersCount = Object.values(room.players).filter((p) => p.online).length;

      if (room.answersReceived >= activePlayersCount) {
        revealQuestionResult(roomCode);
      } else {
        io.to(roomCode).emit('room_update', {
          players: room.players,
          status: room.status,
        });
      }
    });

    socket.on('leave-room', ({ roomId }) => {
      const roomCode = (roomId || '').trim().toUpperCase();
      socket.leave(roomCode);

      roomManager.removePlayer(
        roomCode,
        socket.id,
        (nextSocketId, nextUsername) => {
          io.to(roomCode).emit('host_changed', {
            hostUserId: roomManager.getRoom(roomCode).hostUserId,
            username: nextUsername,
          });
        },
        () => {
          console.log(`Lobby room ${roomCode} has been closed due to inactivity.`);
        }
      );

      const room = roomManager.getRoom(roomCode);
      if (room) {
        io.to(roomCode).emit('room_update', {
          players: room.players,
          status: room.status,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected from battle arena: ${socket.id}`);
      // Find which room this socket was part of
      for (const code in roomManager.rooms) {
        const room = roomManager.rooms[code];
        if (room.players[socket.id]) {
          roomManager.removePlayer(
            code,
            socket.id,
            (nextSocketId, nextUsername) => {
              io.to(code).emit('host_changed', {
                hostUserId: room.hostUserId,
                username: nextUsername,
              });
            },
            () => {
              console.log(`Lobby room ${code} has been closed after disconnection.`);
            }
          );

          io.to(code).emit('room_update', {
            players: room.players,
            status: room.status,
          });
          break;
        }
      }
    });
  });
};
