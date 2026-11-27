const crypto = require('crypto');
const { User, BattleSession, Quiz, Question } = require('../models');
const logger = require('../utils/logger');

// In-memory matchmaking queue grouped by subject
// Each queue entry: { userId, socketId, username, elo, subjectId, avatar, joinedAt }
const matchmakingQueues = new Map(); // subjectId -> Array<Player>

// In-memory active battle sessions
// Key: roomId, Value: BattleSessionState
const activeBattleSessions = new Map();

// Disconnect grace period timers (15 seconds)
// Key: socketId or userId, Value: NodeJS.Timeout
const disconnectTimers = new Map();

// Default fallback question bank (10 curated questions across math, science, and computer science)
const DEFAULT_BATTLE_QUESTIONS = [
  {
    questionText: 'What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?',
    options: ['6x + 5', '3x + 5', '6x - 7', '6x^2 + 5'],
    correctAnswerIndex: 0,
    explanation: 'Using the power rule: d/dx(3x^2) = 6x, d/dx(5x) = 5, and d/dx(-7) = 0. Thus, f\'(x) = 6x + 5.'
  },
  {
    questionText: 'Which data structure uses LIFO (Last In First Out) ordering?',
    options: ['Queue', 'Stack', 'Linked List', 'Binary Heap'],
    correctAnswerIndex: 1,
    explanation: 'A Stack is a LIFO (Last In First Out) data structure where elements are pushed and popped from the top.'
  },
  {
    questionText: 'What is the time complexity of binary search on a sorted array of n elements?',
    options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'],
    correctAnswerIndex: 2,
    explanation: 'Binary search halves the search range with each step, yielding logarithmic O(log n) time complexity.'
  },
  {
    questionText: 'In physics, what is the SI unit of electric capacitance?',
    options: ['Farad', 'Henry', 'Tesla', 'Ohm'],
    correctAnswerIndex: 0,
    explanation: 'The SI unit of electrical capacitance is the Farad (symbol F), named after Michael Faraday.'
  },
  {
    questionText: 'What is the value of log2(64)?',
    options: ['4', '5', '6', '8'],
    correctAnswerIndex: 2,
    explanation: 'Since 2^6 = 64, log2(64) = 6.'
  },
  {
    questionText: 'Which protocol operates at the Transport Layer of the OSI Model?',
    options: ['HTTP', 'TCP', 'IP', 'Ethernet'],
    correctAnswerIndex: 1,
    explanation: 'TCP (Transmission Control Protocol) and UDP operate at Layer 4 (Transport Layer) of the OSI model.'
  },
  {
    questionText: 'In chemistry, which element has the atomic number 6?',
    options: ['Oxygen', 'Nitrogen', 'Carbon', 'Boron'],
    correctAnswerIndex: 2,
    explanation: 'Carbon has an atomic number of 6 and typically has 6 protons and 6 electrons.'
  },
  {
    questionText: 'What is the integral of 1/x dx for x > 0?',
    options: ['ln(x) + C', '1/x^2 + C', 'e^x + C', '-1/x + C'],
    correctAnswerIndex: 0,
    explanation: 'The indefinite integral of 1/x with respect to x is the natural logarithm ln|x| + C.'
  },
  {
    questionText: 'Which law states that current through a conductor is directly proportional to voltage across it?',
    options: ["Ohm's Law", "Faraday's Law", "Newton's First Law", "Coulomb's Law"],
    correctAnswerIndex: 0,
    explanation: "Ohm's Law (V = IR) states that current is directly proportional to potential difference across a conductor."
  },
  {
    questionText: 'What is the worst-case time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n)', 'O(n^2)', 'O(2^n)'],
    correctAnswerIndex: 2,
    explanation: 'When pivots are unbalanced (e.g. array is already sorted and first/last element chosen), QuickSort degrades to O(n^2).'
  }
];

/**
 * Calculates chess ELO rating delta.
 * Outcome: 1 = playerA wins, 0 = playerB wins, 0.5 = draw.
 */
function calculateEloDelta(eloA, eloB, outcome) {
  const kFactor = 32;
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

  const newEloA = Math.round(eloA + kFactor * (outcome - expectedA));
  const newEloB = Math.round(eloB + kFactor * ((1 - outcome) - expectedB));

  return {
    newEloA: Math.max(100, newEloA),
    newEloB: Math.max(100, newEloB),
    deltaA: newEloA - eloA,
    deltaB: newEloB - eloB,
  };
}

/**
 * Fetch or generate randomized battle questions.
 */
async function loadBattleQuestions(subjectId, count = 10) {
  try {
    let questions = [];
    if (Question) {
      const query = { limit: count * 2 };
      if (subjectId && subjectId !== 'general') {
        query.where = { subjectId };
      }
      const dbQuestions = await Question.findAll(query);
      if (dbQuestions && dbQuestions.length > 0) {
        questions = dbQuestions.map(q => ({
          id: q.id,
          questionText: q.questionText || q.text || q.question,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []),
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
          explanation: q.explanation || 'Review the core concepts for this question.'
        })).filter(q => q.options && q.options.length >= 2);
      }
    }

    if (questions.length < count) {
      // Pad with default battle questions
      const shuffledDefaults = [...DEFAULT_BATTLE_QUESTIONS].sort(() => 0.5 - Math.random());
      questions = [...questions, ...shuffledDefaults];
    }

    // Shuffle and pick exact count
    return questions.sort(() => 0.5 - Math.random()).slice(0, count);
  } catch (err) {
    logger.warn('[QuizBattleService] Could not load questions from DB, using fallback bank:', err.message);
    return [...DEFAULT_BATTLE_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, count);
  }
}

/**
 * Adds player to matchmaking queue and attempts to match with suitable peer (+/- 200 ELO).
 */
async function addToMatchmakingQueue(playerData) {
  const {
    userId,
    socketId,
    username = 'Player',
    elo = 1200,
    subjectId = 'general',
    avatar = null
  } = playerData;

  const key = subjectId || 'general';
  if (!matchmakingQueues.has(key)) {
    matchmakingQueues.set(key, []);
  }

  const queue = matchmakingQueues.get(key);

  // Remove any existing entry for this user / socket to prevent duplicate matching
  const existingIdx = queue.findIndex(p => p.userId === userId || p.socketId === socketId);
  if (existingIdx !== -1) {
    queue.splice(existingIdx, 1);
  }

  const newPlayer = {
    userId,
    socketId,
    username,
    elo: Number(elo) || 1200,
    subjectId: key,
    avatar,
    joinedAt: Date.now()
  };

  // Find match with similar ELO (+/- 200)
  const matchIndex = queue.findIndex(opponent => {
    const eloDiff = Math.abs(opponent.elo - newPlayer.elo);
    // Expand bracket slightly over time: 200 base + 50 per 5 seconds waited
    const waitSeconds = (Date.now() - opponent.joinedAt) / 1000;
    const maxDiff = 200 + Math.floor(waitSeconds / 5) * 50;
    return opponent.userId !== userId && eloDiff <= maxDiff;
  });

  if (matchIndex !== -1) {
    const matchedOpponent = queue.splice(matchIndex, 1)[0];
    const roomCode = 'BATTLE_' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Generate synchronized questions
    const questions = await loadBattleQuestions(key, 10);

    const session = {
      roomId: roomCode,
      subjectId: key,
      status: 'playing', // 'playing' | 'round_transition' | 'finished'
      questionCount: questions.length,
      timePerQuestion: 15,
      questions,
      currentQuestionIndex: 0,
      roundStartedAt: Date.now(),
      players: {
        [newPlayer.socketId]: {
          userId: newPlayer.userId,
          socketId: newPlayer.socketId,
          username: newPlayer.username,
          elo: newPlayer.elo,
          avatar: newPlayer.avatar,
          score: 0,
          hp: 100,
          correctCount: 0,
          answeredCurrentQuestion: false,
          currentAnswer: null,
          timeSpentMs: 0,
          connected: true,
          disconnectedAt: null,
        },
        [matchedOpponent.socketId]: {
          userId: matchedOpponent.userId,
          socketId: matchedOpponent.socketId,
          username: matchedOpponent.username,
          elo: matchedOpponent.elo,
          avatar: matchedOpponent.avatar,
          score: 0,
          hp: 100,
          correctCount: 0,
          answeredCurrentQuestion: false,
          currentAnswer: null,
          timeSpentMs: 0,
          connected: true,
          disconnectedAt: null,
        }
      },
      answerHistory: []
    };

    activeBattleSessions.set(roomCode, session);

    return {
      matched: true,
      roomId: roomCode,
      player1: session.players[newPlayer.socketId],
      player2: session.players[matchedOpponent.socketId],
      session,
    };
  }

  // No match found yet, enqueue player
  queue.push(newPlayer);
  return { matched: false, queued: true, player: newPlayer };
}

/**
 * Removes a player from all matchmaking queues.
 */
function removeFromMatchmakingQueue(socketId) {
  for (const [subjectId, queue] of matchmakingQueues.entries()) {
    const idx = queue.findIndex(p => p.socketId === socketId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      return true;
    }
  }
  return false;
}

/**
 * Retrieves an active battle session.
 */
function getBattleSession(roomId) {
  return activeBattleSessions.get(roomId);
}

/**
 * Finds which room a socket is currently in.
 */
function findSessionBySocketId(socketId) {
  for (const [roomId, session] of activeBattleSessions.entries()) {
    if (session.players[socketId]) {
      return { roomId, session };
    }
  }
  return null;
}

/**
 * Submits an answer for a player and calculates score / dynamic HP.
 */
function submitAnswer({ roomId, socketId, questionIndex, selectedOption, clientTimestamp }) {
  const session = activeBattleSessions.get(roomId);
  if (!session || session.status === 'finished') {
    return { error: 'Battle session not found or already completed.' };
  }

  const player = session.players[socketId];
  if (!player) {
    return { error: 'Player not part of this battle.' };
  }

  // Validate question index
  if (questionIndex !== session.currentQuestionIndex) {
    return { error: 'Answer submitted for invalid or expired question round.' };
  }

  if (player.answeredCurrentQuestion) {
    return { alreadySubmitted: true, player };
  }

  const currentQ = session.questions[session.currentQuestionIndex];
  const now = Date.now();
  const timeElapsedMs = Math.max(0, now - session.roundStartedAt);
  const timeLimitMs = session.timePerQuestion * 1000;

  // Authoritative server-side timestamp validation (allow 1.5s network grace)
  const isTimeValid = timeElapsedMs <= timeLimitMs + 1500;
  const isCorrect = isTimeValid && selectedOption === currentQ.correctAnswerIndex;

  player.answeredCurrentQuestion = true;
  player.currentAnswer = selectedOption;
  player.timeSpentMs = timeElapsedMs;

  let pointsEarned = 0;
  if (isCorrect) {
    player.correctCount++;
    // Speed bonus: 100 base + up to 100 bonus points based on remaining time
    const remainingRatio = Math.max(0, (timeLimitMs - timeElapsedMs) / timeLimitMs);
    pointsEarned = 100 + Math.round(remainingRatio * 100);
    player.score += pointsEarned;
  }
  player.lastPointsEarned = pointsEarned;

  // Find opponent
  const opponentSocketId = Object.keys(session.players).find(id => id !== socketId);
  const opponent = opponentSocketId ? session.players[opponentSocketId] : null;

  // Reduce opponent HP on correct answer
  if (isCorrect && opponent) {
    const damage = Math.round(100 / session.questionCount);
    opponent.hp = Math.max(0, opponent.hp - damage);
  }

  // Check if both players answered
  const bothAnswered = Object.values(session.players).every(p => p.answeredCurrentQuestion || !p.connected);

  return {
    success: true,
    isCorrect,
    pointsEarned,
    player,
    opponent,
    bothAnswered,
    session,
  };
}

/**
 * Transitions battle session to next question or completes battle.
 */
function advanceRound(roomId) {
  const session = activeBattleSessions.get(roomId);
  if (!session) return null;

  session.currentQuestionIndex++;
  session.roundStartedAt = Date.now();

  // Reset player per-question flags
  for (const socketId in session.players) {
    session.players[socketId].answeredCurrentQuestion = false;
    session.players[socketId].currentAnswer = null;
    session.players[socketId].lastPointsEarned = 0;
    session.players[socketId].timeSpentMs = 0;
  }

  const isFinished = session.currentQuestionIndex >= session.questionCount;
  if (isFinished) {
    session.status = 'finished';
  }

  return {
    isFinished,
    currentQuestionIndex: session.currentQuestionIndex,
    question: isFinished ? null : session.questions[session.currentQuestionIndex],
    totalQuestions: session.questionCount,
    timeLimit: session.timePerQuestion
  };
}

/**
 * Finalizes battle, computes ELO updates, and persists to DB.
 */
async function finalizeBattle(roomId, forfietingSocketId = null) {
  const session = activeBattleSessions.get(roomId);
  if (!session) return null;

  session.status = 'finished';

  const playerSockets = Object.keys(session.players);
  if (playerSockets.length < 2) return null;

  const playerA = session.players[playerSockets[0]];
  const playerB = session.players[playerSockets[1]];

  let outcomeA = 0.5; // 1 = A wins, 0 = B wins, 0.5 = Draw

  if (forfietingSocketId) {
    outcomeA = forfietingSocketId === playerA.socketId ? 0 : 1;
  } else if (playerA.score > playerB.score) {
    outcomeA = 1;
  } else if (playerB.score > playerA.score) {
    outcomeA = 0;
  }

  const eloResults = calculateEloDelta(playerA.elo, playerB.elo, outcomeA);

  playerA.newElo = eloResults.newEloA;
  playerA.eloDelta = eloResults.deltaA;
  playerB.newElo = eloResults.newEloB;
  playerB.eloDelta = eloResults.deltaB;

  const winner = outcomeA === 1 ? playerA : (outcomeA === 0 ? playerB : null);
  const loser = outcomeA === 1 ? playerB : (outcomeA === 0 ? playerA : null);

  // Persist ELO changes to Database
  try {
    if (User) {
      if (typeof User.adjustRatings === 'function') {
        if (winner && loser) {
          await User.adjustRatings(winner.userId, loser.userId).catch(() => {});
        }
      } else {
        await User.update({ eloRating: playerA.newElo }, { where: { id: playerA.userId } }).catch(() => {});
        await User.update({ eloRating: playerB.newElo }, { where: { id: playerB.userId } }).catch(() => {});
      }
    }

    if (BattleSession) {
      await BattleSession.update(
        {
          status: 'finished',
          scores: {
            [playerA.userId]: { score: playerA.score, eloDelta: playerA.eloDelta },
            [playerB.userId]: { score: playerB.score, eloDelta: playerB.eloDelta }
          }
        },
        { where: { roomCode: roomId } }
      ).catch(() => {});
    }
  } catch (dbErr) {
    logger.error('[QuizBattleService] Error persisting battle results to database:', dbErr.message);
  }

  const summary = {
    roomId,
    winner: winner ? { userId: winner.userId, username: winner.username, score: winner.score } : null,
    isDraw: outcomeA === 0.5,
    forfeited: Boolean(forfietingSocketId),
    players: [
      {
        userId: playerA.userId,
        username: playerA.username,
        score: playerA.score,
        correctCount: playerA.correctCount,
        oldElo: playerA.elo,
        newElo: playerA.newElo,
        eloDelta: playerA.eloDelta,
        hp: playerA.hp
      },
      {
        userId: playerB.userId,
        username: playerB.username,
        score: playerB.score,
        correctCount: playerB.correctCount,
        oldElo: playerB.elo,
        newElo: playerB.newElo,
        eloDelta: playerB.eloDelta,
        hp: playerB.hp
      }
    ],
    questionBreakdown: session.questions.map((q, idx) => ({
      index: idx + 1,
      questionText: q.questionText,
      correctAnswer: q.options[q.correctAnswerIndex],
      explanation: q.explanation
    }))
  };

  return summary;
}

/**
 * Handles graceful disconnect with a 15-second grace period.
 */
function scheduleDisconnectForfeit(socketId, onForfeitCallback) {
  const sessionInfo = findSessionBySocketId(socketId);
  if (!sessionInfo) return null;

  const { roomId, session } = sessionInfo;
  const player = session.players[socketId];
  if (!player || session.status === 'finished') return null;

  player.connected = false;
  player.disconnectedAt = Date.now();

  // Clear existing timer if any
  if (disconnectTimers.has(socketId)) {
    clearTimeout(disconnectTimers.get(socketId));
  }

  const timer = setTimeout(async () => {
    disconnectTimers.delete(socketId);
    if (!player.connected && session.status !== 'finished') {
      logger.info(`[QuizBattleService] 15-second grace period elapsed for ${player.username} in room ${roomId}. Forfeiting.`);
      const result = await finalizeBattle(roomId, socketId);
      if (onForfeitCallback) onForfeitCallback(roomId, result);
    }
  }, 15000);

  disconnectTimers.set(socketId, timer);

  return { roomId, player, gracePeriodSeconds: 15 };
}

/**
 * Reconnects a player to an ongoing session within grace period.
 */
function handleReconnection(roomId, userId, newSocketId) {
  const session = activeBattleSessions.get(roomId);
  if (!session || session.status === 'finished') return null;

  // Find player by userId
  const oldSocketId = Object.keys(session.players).find(
    sid => session.players[sid].userId === userId
  );

  if (!oldSocketId) return null;

  // Cancel forfeit timer
  if (disconnectTimers.has(oldSocketId)) {
    clearTimeout(disconnectTimers.get(oldSocketId));
    disconnectTimers.delete(oldSocketId);
  }

  const playerData = session.players[oldSocketId];
  playerData.connected = true;
  playerData.socketId = newSocketId;
  playerData.disconnectedAt = null;

  delete session.players[oldSocketId];
  session.players[newSocketId] = playerData;

  return {
    session,
    player: playerData,
    currentQuestion: session.questions[session.currentQuestionIndex],
    currentQuestionIndex: session.currentQuestionIndex,
    timeRemaining: Math.max(0, Math.round((session.timePerQuestion * 1000 - (Date.now() - session.roundStartedAt)) / 1000))
  };
}

module.exports = {
  calculateEloDelta,
  addToMatchmakingQueue,
  removeFromMatchmakingQueue,
  getBattleSession,
  findSessionBySocketId,
  submitAnswer,
  advanceRound,
  finalizeBattle,
  scheduleDisconnectForfeit,
  handleReconnection,
  activeBattleSessions,
  matchmakingQueues,
  DEFAULT_BATTLE_QUESTIONS
};
