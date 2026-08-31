const redisService = require('./redisService');
const logger = require('../utils/logger');

const QUEUE_KEY = 'matchmaking:queue';

/** Key holding the epoch millis at which a user entered the queue. */
const joinedKey = (userId) => `matchmaking:joined:${userId}`;

/**
 * Pushes a user into the Redis Sorted Set matchmaking queue, scored by ELO.
 */
async function joinQueue(userId, elo = 1200) {
  if (!redisService.isReady || !redisService.client) {
    logger.warn('[MatchmakingService] Redis offline, queue join bypassed locally.', { userId });
    return false;
  }

  try {
    const now = Date.now();
    // Add to sorted set (score = ELO)
    await redisService.client.zadd(QUEUE_KEY, elo, userId);
    // Set join timestamp
    await redisService.client.set(joinedKey(userId), now);
    logger.info('[MatchmakingService] User joined matchmaking queue.', { userId, elo });
    return true;
  } catch (err) {
    logger.error('[MatchmakingService] Failed to join queue:', err.message);
    return false;
  }
}

/**
 * Removes a user from the Redis sorted set queue.
 */
async function leaveQueue(userId) {
  if (!redisService.isReady || !redisService.client) return false;

  try {
    await redisService.client.zrem(QUEUE_KEY, userId);
    await redisService.client.del(joinedKey(userId));
    logger.info('[MatchmakingService] User left matchmaking queue.', { userId });
    return true;
  } catch (err) {
    logger.error('[MatchmakingService] Failed to leave queue:', err.message);
    return false;
  }
}

/**
 * Calculates ELO updates using standard ELO formulas.
 * outcome: 1 (A wins), 0 (B wins), 0.5 (Draw)
 */
function calculateEloChange(eloA, eloB, outcome) {
  const kFactor = 32;
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

  const newEloA = Math.round(eloA + kFactor * (outcome - expectedA));
  const newEloB = Math.round(eloB + kFactor * (1 - outcome - expectedB));

  return {
    newEloA: Math.max(100, newEloA), // Floor ELO to 100
    newEloB: Math.max(100, newEloB),
  };
}

module.exports = {
  joinQueue,
  leaveQueue,
  calculateEloChange,
  QUEUE_KEY,
};
