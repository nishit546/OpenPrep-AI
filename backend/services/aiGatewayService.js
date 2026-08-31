/**
 * @fileoverview Google Gemini AI Token Bucket Rate Limiter, Tiered Budgeting, and Prompt Caching Gateway.
 */
const crypto = require('crypto');
const redisService = require('./redisService');
const logger = require('../utils/logger');

// Local fallback memory cache in case Redis Sentinel is offline
const memoryCache = new Map();
const memoryLimits = new Map();

// Tier daily budgets (in tokens)
const BUDGETS = {
  FREE: 50000,
  PRO: 500000,
};

// Rate limits per minute
const RPM_LIMIT = 15; // Requests per minute
const TPM_LIMIT = 30000; // Tokens per minute

// Cache hit/miss counters for telemetry
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Checks if the request is within rate limits and daily budget.
 * @param {string} userId - Auth user ID
 * @param {string} tier - User tier ('FREE' or 'PRO')
 * @param {number} estimatedTokens - Estimated token count of the incoming prompt
 * @returns {Promise<{ allowed: boolean, reason: string|null }>} Limit status
 */
const checkRateLimit = async (userId, tier = 'FREE', estimatedTokens = 1000) => {
  const now = Date.now();
  const minuteKey = Math.floor(now / 60000);
  const dailyDate = new Date().toISOString().split('T')[0];

  const dailyLimit = BUDGETS[tier.toUpperCase()] || BUDGETS.FREE;

  if (redisService.isReady) {
    try {
      const client = redisService.connect();

      // 1. Check daily budget
      const dailyKey = `ai:daily:${userId}:${dailyDate}`;
      const dailyUsed = parseInt(await client.get(dailyKey) || '0', 10);
      if (dailyUsed + estimatedTokens > dailyLimit) {
        return { allowed: false, reason: `Daily token budget of ${dailyLimit} exceeded for tier ${tier}.` };
      }

      // 2. Check RPM (sliding window using sorted set)
      const rpmKey = `ai:rpm:${userId}`;
      await client.zadd(rpmKey, now, now);
      await client.zremrangebyscore(rpmKey, 0, now - 60000);
      const rpmCount = await client.zcard(rpmKey);
      await client.expire(rpmKey, 90);

      if (rpmCount > RPM_LIMIT) {
        return { allowed: false, reason: 'RPM (Requests Per Minute) rate limit exceeded.' };
      }

      // 3. Check TPM (sliding window)
      const tpmKey = `ai:tpm:${userId}:${minuteKey}`;
      const tpmUsed = parseInt(await client.get(tpmKey) || '0', 10);
      if (tpmUsed + estimatedTokens > TPM_LIMIT) {
        return { allowed: false, reason: 'TPM (Tokens Per Minute) rate limit exceeded.' };
      }

      // Increment TPM window
      await client.incrby(tpmKey, estimatedTokens);
      await client.expire(tpmKey, 120);

      return { allowed: true, reason: null };
    } catch (err) {
      logger.warn('[AIGatewayService] Redis connection error, falling back to local limits.');
    }
  }

  // Fallback to local memory limits
  const memDailyKey = `${userId}:${dailyDate}`;
  const dailyUsed = memoryLimits.get(memDailyKey) || 0;
  if (dailyUsed + estimatedTokens > dailyLimit) {
    return { allowed: false, reason: 'Daily memory budget exceeded' };
  }

  // Clean old window items
  const userWindows = memoryLimits.get(userId) || [];
  const validWindows = userWindows.filter(t => t > now - 60000);
  if (validWindows.length >= RPM_LIMIT) {
    return { allowed: false, reason: 'RPM limit exceeded (Memory fallback)' };
  }

  validWindows.push(now);
  memoryLimits.set(userId, validWindows);
  memoryLimits.set(memDailyKey, dailyUsed + estimatedTokens);

  return { allowed: true, reason: null };
};

/**
 * Commits token usage to the daily budget upon response completion.
 * @param {string} userId
 * @param {number} actualTokens
 */
const commitTokenUsage = async (userId, actualTokens) => {
  const dailyDate = new Date().toISOString().split('T')[0];
  const dailyKey = `ai:daily:${userId}:${dailyDate}`;

  if (redisService.isReady) {
    try {
      const client = redisService.connect();
      await client.incrby(dailyKey, actualTokens);
      await client.expire(dailyKey, 86400 * 2); // 2 days
      return;
    } catch (err) {
      // Fallback
    }
  }

  const memDailyKey = `${userId}:${dailyDate}`;
  const current = memoryLimits.get(memDailyKey) || 0;
  memoryLimits.set(memDailyKey, current + actualTokens);
};

/**
 * Searches prompt cache for identical query fingerprint.
 * @param {string} promptInput - String query/inputs
 * @returns {Promise<object|null>} Cached response body or null
 */
const getCachedPrompt = async (promptInput) => {
  const hash = crypto.createHash('sha256').update(promptInput).digest('hex');
  const cacheKey = `ai:prompt-cache:${hash}`;

  if (redisService.isReady) {
    try {
      const client = redisService.connect();
      const cached = await client.get(cacheKey);
      if (cached) {
        cacheHits++;
        return JSON.parse(cached);
      }
    } catch (err) {
      // Fallback
    }
  }

  const localCached = memoryCache.get(hash);
  if (localCached) {
    cacheHits++;
    return localCached;
  }

  cacheMisses++;
  return null;
};

/**
 * Caches response output body mapped to query fingerprint.
 */
const setCachedPrompt = async (promptInput, responseBody, ttlSeconds = 1200) => {
  const hash = crypto.createHash('sha256').update(promptInput).digest('hex');
  const cacheKey = `ai:prompt-cache:${hash}`;

  if (redisService.isReady) {
    try {
      const client = redisService.connect();
      await client.set(cacheKey, JSON.stringify(responseBody), 'EX', ttlSeconds);
    } catch (err) {
      // Fallback
    }
  }

  memoryCache.set(hash, responseBody);
  setTimeout(() => memoryCache.delete(hash), ttlSeconds * 1000);
};

const getCacheHitRatio = () => {
  const total = cacheHits + cacheMisses;
  return total > 0 ? (cacheHits / total) : 0;
};

module.exports = {
  checkRateLimit,
  commitTokenUsage,
  getCachedPrompt,
  setCachedPrompt,
  getCacheHitRatio,
  cacheHits,
  cacheMisses,
  BUDGETS,
};
