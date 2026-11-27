const crypto = require('crypto');
const quizBattleService = require('../services/quizBattleService');
const Quiz = require('../models/Quiz');
const logger = require('../utils/logger');

// In-memory room storage for custom room code battles (legacy / friend match support)
const customRooms = new Map();
const customRoomQuestions = new Map();

function setupQuizBattleSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`[QuizBattleSocket] Connection established: ${socket.id}`);

    // ==========================================
    // 1v1 SPEED QUIZ BATTLE MATCHMAKING (Issue #2307)
    // ==========================================

    // 1. Join Matchmaking Queue
    socket.on('battle:join_queue', async (data = {}) => {
      try {
        const userId = data.userId || socket.user?.id || socket.id;
        const username = data.username || socket.user?.name || `Player_${socket.id.substring(0, 4)}`;
        const elo = Number(data.elo || socket.user?.eloRating || 1200);
        const subjectId = data.subjectId || 'general';
        const avatar = data.avatar || socket.user?.avatar || null;

        logger.info(`[QuizBattleSocket] User joining queue: ${username} (ELO: ${elo}, Subject: ${subjectId})`);

        const result = await quizBattleService.addToMatchmakingQueue({
          userId,
          socketId: socket.id,
          username,
          elo,
          subjectId,
          avatar,
        });

        if (result.matched) {
          const { roomId, player1, player2, session } = result;
          const p1Socket = io.sockets.sockets.get(player1.socketId);
          const p2Socket = io.sockets.sockets.get(player2.socketId);

          if (p1Socket) p1Socket.join(roomId);
          if (p2Socket) p2Socket.join(roomId);

          logger.info(`[QuizBattleSocket] Match created! Room: ${roomId} (${player1.username} vs ${player2.username})`);

          // Send matched event to Player 1 with Player 2 as opponent
          io.to(player1.socketId).emit('battle:matched', {
            roomId,
            self: player1,
            opponent: player2,
            questions: session.questions.map(q => ({
              questionText: q.questionText,
              options: q.options,
            })),
            totalQuestions: session.questionCount,
            timeLimit: session.timePerQuestion,
            roundStartTime: session.roundStartedAt,
            currentQuestionIndex: 0,
          });

          // Send matched event to Player 2 with Player 1 as opponent
          io.to(player2.socketId).emit('battle:matched', {
            roomId,
            self: player2,
            opponent: player1,
            questions: session.questions.map(q => ({
              questionText: q.questionText,
              options: q.options,
            })),
            totalQuestions: session.questionCount,
            timeLimit: session.timePerQuestion,
            roundStartTime: session.roundStartedAt,
            currentQuestionIndex: 0,
          });

          // Start synchronized round clock timer
          startSynchronizedClock(io, roomId, session);
        } else {
          socket.emit('battle:queued', {
            status: 'queued',
            message: 'Searching for an opponent with similar ELO (+/- 200 rating)...',
            subjectId,
          });
        }
      } catch (err) {
        logger.error('[QuizBattleSocket] Error in battle:join_queue:', err.message);
        socket.emit('battle:error', { message: 'Failed to join matchmaking queue.' });
      }
    });

    // 2. Submit Answer during 1v1 Battle
    socket.on('battle:answer_submitted', async (data = {}) => {
      try {
        const { roomId, questionIndex, selectedOption, clientTimestamp } = data;
        const result = quizBattleService.submitAnswer({
          roomId,
          socketId: socket.id,
          questionIndex,
          selectedOption,
          clientTimestamp,
        });

        if (result.error) {
          return socket.emit('battle:error', { message: result.error });
        }

        // Send submission acknowledgement to answering player
        // Do not reveal correctness or score while an opponent can still answer.
        socket.emit('battle:answer_ack', { accepted: true, questionIndex });

        // Broadcast real-time progress update to opponent
        if (result.opponent) {
          io.to(result.opponent.socketId).emit('battle:opponent_progress', {
            opponentLockedIn: true,
            questionIndex,
          });
        }

        // If both players have locked in answers for the current question
        if (result.bothAnswered) {
          handleRoundTransition(io, roomId);
        }
      } catch (err) {
        logger.error('[QuizBattleSocket] Error in battle:answer_submitted:', err.message);
      }
    });

    // 3. Rematch Request
    socket.on('battle:rematch_request', async ({ roomId, opponentUserId }) => {
      const session = quizBattleService.getBattleSession(roomId);
      if (!session) return;

      const opponentSocketId = Object.keys(session.players).find(id => id !== socket.id);
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('battle:rematch_offered', {
          roomId,
          offeredBy: socket.user?.name || 'Opponent',
        });
      }
    });

    // ==========================================
    // LEGACY CUSTOM ROOM CODE SUPPORT (Friend lobbies)
    // ==========================================

    socket.on('create-room', async ({ hostName, quizId }) => {
      const quiz = await Quiz.findByPk(quizId).catch(() => null);
      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        return socket.emit('error-message', { message: 'Battle quiz not found.' });
      }
      const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const room = {
        roomCode,
        hostId: socket.id,
        quizId,
        status: 'lobby',
        players: [{ id: socket.id, name: hostName, score: 0, connected: true }],
        currentQuestionIndex: 0,
        timer: 30,
      };

      customRooms.set(roomCode, room);
      // Keep the key outside the serialized room sent to clients.
      customRoomQuestions.set(roomCode, quiz.questions);
      socket.join(roomCode);
      socket.emit('room-created', { roomCode, room });
    });

    socket.on('join-room', ({ roomCode, playerName }) => {
      const room = customRooms.get(roomCode);
      if (!room) {
        return socket.emit('error-message', { message: 'Room not found with this code.' });
      }
      if (room.status !== 'lobby') {
        return socket.emit('error-message', { message: 'Battle already in progress.' });
      }

      socket.join(roomCode);
      room.players.push({ id: socket.id, name: playerName, score: 0, connected: true });
      io.to(roomCode).emit('update-lobby', room);
    });

    socket.on('start-battle', ({ roomCode }) => {
      const room = customRooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;

      room.status = 'countdown';
      let countdown = 5;

      const countdownInterval = setInterval(() => {
        io.to(roomCode).emit('countdown-tick', { countdown });
        countdown--;
        if (countdown < 0) {
          clearInterval(countdownInterval);
          room.status = 'active';
          room.roundStartedAt = Date.now();
          io.to(roomCode).emit('start-questions', { questionIndex: room.currentQuestionIndex });
        }
      }, 1000);
    });

    socket.on('submit-answer', ({ roomCode, selectedOption }) => {
      const room = customRooms.get(roomCode);
      if (!room || room.status !== 'active') return;

      const player = room.players.find((p) => p.id === socket.id);
      const question = customRoomQuestions.get(roomCode)?.[room.currentQuestionIndex];
      if (!player || !question || player.answeredQuestionIndex === room.currentQuestionIndex) return;
      player.answeredQuestionIndex = room.currentQuestionIndex;
      const elapsedSeconds = Math.floor((Date.now() - room.roundStartedAt) / 1000);
      if (elapsedSeconds <= room.timer && Number(selectedOption) === Number(question.correctAnswer)) {
        player.score += 100 + Math.max(0, room.timer - elapsedSeconds) * 5;
      }

      const sortedLeaderboard = [...room.players].sort((a, b) => b.score - a.score);
      io.to(roomCode).emit('live-leaderboard', { leaderboard: sortedLeaderboard });
    });

    // ==========================================
    // DISCONNECTION & GRACE PERIOD HANDLING
    // ==========================================

    socket.on('disconnect', () => {
      logger.info(`[QuizBattleSocket] Disconnected: ${socket.id}`);

      // 1. Remove from matchmaking queue if waiting
      quizBattleService.removeFromMatchmakingQueue(socket.id);

      // 2. Check if in active 1v1 battle
      const sessionInfo = quizBattleService.findSessionBySocketId(socket.id);
      if (sessionInfo) {
        const { roomId, session } = sessionInfo;
        const disconnectingPlayer = session.players[socket.id];

        // Notify opponent about disconnect and 15s grace period
        io.to(roomId).emit('battle:disconnect', {
          disconnectedPlayer: disconnectingPlayer?.username || 'Opponent',
          gracePeriodSeconds: 15,
          message: `${disconnectingPlayer?.username || 'Opponent'} disconnected. 15-second grace period active.`,
        });

        // Schedule forfeit after 15 seconds
        quizBattleService.scheduleDisconnectForfeit(socket.id, (forfeitedRoomId, summary) => {
          io.to(forfeitedRoomId).emit('battle:round_ended', {
            ...summary,
            forfeited: true,
            message: 'Opponent timed out. Match forfeited.',
          });
        });
      }

      // 3. Clean up custom rooms
      for (const [roomCode, room] of customRooms.entries()) {
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          player.connected = false;
          io.to(roomCode).emit('update-lobby', room);

          setTimeout(() => {
            if (!player.connected) {
              room.players = room.players.filter((p) => p.id !== socket.id);
              if (room.players.length === 0) {
                customRooms.delete(roomCode);
                customRoomQuestions.delete(roomCode);
              } else io.to(roomCode).emit('update-lobby', room);
            }
          }, 15000);
        }
      }
    });
  });
}

/**
 * Manages the synchronized server question clock.
 */
function startSynchronizedClock(io, roomId, session) {
  let remainingSeconds = session.timePerQuestion;

  const clockInterval = setInterval(() => {
    const currentSession = quizBattleService.getBattleSession(roomId);
    if (!currentSession || currentSession.status === 'finished') {
      clearInterval(clockInterval);
      return;
    }

    remainingSeconds--;
    io.to(roomId).emit('battle:timer_tick', {
      timeRemaining: Math.max(0, remainingSeconds),
      questionIndex: currentSession.currentQuestionIndex,
    });

    if (remainingSeconds <= 0) {
      clearInterval(clockInterval);
      // Auto advance round when time expires
      handleRoundTransition(io, roomId);
    }
  }, 1000);

  session.activeClockInterval = clockInterval;
}

/**
 * Handles transition to the next question round or end of match.
 */
async function handleRoundTransition(io, roomId) {
  const session = quizBattleService.getBattleSession(roomId);
  if (!session || session.status === 'finished' || session.roundResolving) return;
  session.roundResolving = true;

  if (session.activeClockInterval) {
    clearInterval(session.activeClockInterval);
    session.activeClockInterval = null;
  }

  const completedQuestion = session.questions[session.currentQuestionIndex];
  if (completedQuestion) {
    for (const [socketId, player] of Object.entries(session.players)) {
      const opponent = Object.values(session.players).find((candidate) => candidate !== player);
      io.to(socketId).emit('battle:question_result', {
        questionIndex: session.currentQuestionIndex,
        correctAnswerIndex: completedQuestion.correctAnswerIndex,
        explanation: completedQuestion.explanation || '',
        isCorrect: player.currentAnswer === completedQuestion.correctAnswerIndex,
        pointsEarned: player.lastPointsEarned || 0,
        score: player.score,
        selfHp: player.hp,
        opponentScore: opponent?.score,
        opponentHp: opponent?.hp,
      });
    }
  }

  // Give both clients time to see the completed round before changing questions.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (session.status === 'finished') return;
  session.roundResolving = false;

  // Advance round
  const transition = quizBattleService.advanceRound(roomId);
  if (!transition) return;

  if (transition.isFinished) {
    // Battle Complete! Finalize and calculate ELO
    const summary = await quizBattleService.finalizeBattle(roomId);
    io.to(roomId).emit('battle:round_ended', summary);
  } else {
    // Emit new question to both players
    io.to(roomId).emit('battle:new_question', {
      questionIndex: transition.currentQuestionIndex,
      question: {
        questionText: transition.question.questionText,
        options: transition.question.options,
      },
      totalQuestions: transition.totalQuestions,
      timeLimit: transition.timeLimit,
      roundStartTime: session.roundStartedAt,
    });

    // Start clock for the new round
    startSynchronizedClock(io, roomId, session);
  }
}

module.exports = setupQuizBattleSocket;
