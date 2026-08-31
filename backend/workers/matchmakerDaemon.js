const redisService = require('../services/redisService');
const { QUEUE_KEY } = require('../services/matchmakingService');
const { BattleSession, Quiz } = require('../models');
const logger = require('../utils/logger');

let intervalId = null;

async function findMatches() {
  if (!redisService.isReady || !redisService.client) return;

  try {
    const queue = await redisService.client.zrange(QUEUE_KEY, 0, -1, 'WITHSCORES');
    if (!queue || queue.length < 4) return; // Need at least 2 players (each entry is [member, score])

    const players = [];
    for (let i = 0; i < queue.length; i += 2) {
      players.push({
        userId: queue[i],
        elo: Number(queue[i + 1]),
      });
    }

    const now = Date.now();
    // Resolve wait times and allowed brackets
    for (const p of players) {
      const joinTimeStr = await redisService.client.get(`matchmaking:joined:${p.userId}`);
      const joinedTime = joinTimeStr ? Number(joinTimeStr) : now;
      p.waitSec = (now - joinedTime) / 1000;
      // Widen bracket by 50 points for every 5 seconds they wait
      p.allowedDiff = 50 + Math.floor(p.waitSec / 5) * 50;
    }

    // Sort by ELO to match closest players
    players.sort((a, b) => a.elo - b.elo);

    const matchedUserIds = new Set();
    const matchedPairs = [];

    for (let i = 0; i < players.length - 1; i++) {
      const A = players[i];
      const B = players[i + 1];

      if (matchedUserIds.has(A.userId) || matchedUserIds.has(B.userId)) continue;

      const eloDiff = Math.abs(A.elo - B.elo);
      const maxAllowed = Math.max(A.allowedDiff, B.allowedDiff);

      if (eloDiff <= maxAllowed) {
        matchedPairs.push({ player1: A, player2: B });
        matchedUserIds.add(A.userId);
        matchedUserIds.add(B.userId);
        i++; // Skip B on next cycle
      }
    }

    for (const pair of matchedPairs) {
      const { player1, player2 } = pair;

      // Remove from matchmaking queues in Redis
      await redisService.client.zrem(QUEUE_KEY, player1.userId, player2.userId);
      await redisService.client.del(`matchmaking:joined:${player1.userId}`);
      await redisService.client.del(`matchmaking:joined:${player2.userId}`);

      // Locate a default quiz to associate
      const quiz = await Quiz.findOne();
      const roomCode = 'RANKED_' + Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create BattleSession
      await BattleSession.create({
        roomCode,
        roomName: 'Ranked Battle Arena',
        hostUserId: player1.userId,
        status: 'waiting',
        questionCount: 5,
        timePerQuestion: 15,
        quiz: quiz ? quiz.id : null,
      });

      logger.info('[MatchmakerDaemon] Match found!', {
        p1: player1.userId,
        p2: player2.userId,
        roomCode,
      });

      // Publish connection details to Pub/Sub channel
      await redisService.client.publish(
        'matchmaking:matched',
        JSON.stringify({
          player1: player1.userId,
          player2: player2.userId,
          roomCode,
        })
      );
    }
  } catch (err) {
    logger.error('[MatchmakerDaemon] Find matches iteration failed:', err.message);
  }
}

function startMatchmakerDaemon() {
  if (intervalId) return;
  logger.info('[MatchmakerDaemon] Matchmaker background daemon starting...');
  intervalId = setInterval(findMatches, 2000);
}

function stopMatchmakerDaemon() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[MatchmakerDaemon] Matchmaker background daemon stopped.');
  }
}

module.exports = {
  findMatches,
  startMatchmakerDaemon,
  stopMatchmakerDaemon,
};
