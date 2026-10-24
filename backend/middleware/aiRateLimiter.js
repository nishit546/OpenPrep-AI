/**
 * Token Bucket Rate Limiter & Tiered Daily Quota Guard Middleware
 * Distributed Redis-backed rate limiting with Lua script atomicity,
 * in-memory fallback, RFC 6585 compliance, and daily usage ledger logging.
 */

let redisService = null;
try {
  redisService = require('../services/redisService');
} catch (e) {
  // Graceful fallback if redisService is not resolvable
}

// In-memory token bucket store for high-speed tracking and Redis-fallback / unit tests
const inMemoryBuckets = new Map();
const inMemoryDailyUsage = new Map();

const TIER_CONFIGS = {
  free: {
    hourlyLimit: 20,
    burstCapacity: 5,
    refillRatePerSec: 20 / 3600, // ~1 token every 180s
    dailyQuota: 50,
  },
  pro: {
    hourlyLimit: 120,
    burstCapacity: 15,
    refillRatePerSec: 120 / 3600, // ~1 token every 30s
    dailyQuota: 500,
  },
};

/**
 * Calculates remaining seconds until the next local midnight reset.
 * @returns {number}
 */
function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/**
 * Formats current date as YYYY-MM-DD for daily quota isolation.
 */
function getTodayDateKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Records AI token consumption asynchronously into the AIUsageLog ledger.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {number} durationMs
 */
function recordAiUsageLog(req, res, durationMs) {
  try {
    const db = require('../models');
    if (!db) return;
    const Model = db.AIUsageLog || db.AiUsageLog;
    if (!Model) return;

    const user = req.user || {};
    const userId = user.id || user.userId;
    if (!userId) return;

    const feature = req.baseUrl || req.path || 'ai-endpoint';
    const estimatedTokens = req.body && typeof req.body.prompt === 'string'
      ? Math.max(10, Math.ceil(req.body.prompt.length / 4))
      : 50;

    Model.create({
      userId: String(userId),
      feature,
      provider: 'gemini',
      requestType: req.method || 'POST',
      requestCount: 1,
      estimatedTokens,
      promptTokens: estimatedTokens,
      completionTokens: 0,
      costEstimated: (estimatedTokens / 1000000) * 0.35, // ~$0.35 per 1M tokens
      status: 'success',
      responseTime: durationMs,
    }).catch((err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[aiRateLimiter] Failed to write AIUsageLog entry:', err.message);
      }
    });
  } catch (err) {
    // Non-blocking log failure
  }
}

/**
 * Lua script for atomic Redis Token Bucket evaluation:
 * - KEYS[1]: bucket key
 * - ARGV[1]: burst capacity
 * - ARGV[2]: refill rate per second
 * - ARGV[3]: current unix timestamp in seconds
 */
const REDIS_TOKEN_BUCKET_LUA = `
local bucket_key = KEYS[1]
local burst_capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now_sec = tonumber(ARGV[3])
local cost = 1.0

local bucket = redis.call('HMGET', bucket_key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if not tokens then
    tokens = burst_capacity
    last_refill = now_sec
else
    local delta = math.max(0, now_sec - last_refill)
    tokens = math.min(burst_capacity, tokens + (delta * refill_rate))
    last_refill = now_sec
end

local allowed = false
if tokens >= cost then
    tokens = tokens - cost
    allowed = true
end

redis.call('HMSET', bucket_key, 'tokens', tokens, 'lastRefill', last_refill)
redis.call('EXPIRE', bucket_key, 7200)

local retry_after = 0
if not allowed then
    retry_after = math.max(1, math.ceil((cost - tokens) / refill_rate))
end

return {allowed and 1 or 0, math.floor(tokens), retry_after}
`;

/**
 * Redis-backed distributed token bucket and daily quota handler.
 */
async function handleRedisRateLimit(req, res, next, config, tier, userId) {
  const redis = redisService.client;
  const today = getTodayDateKey();
  const dailyKey = `ratelimit:ai:daily:${userId}:${today}`;
  const bucketKey = `ratelimit:ai:bucket:${userId}:${tier}`;
  const nowSec = Date.now() / 1000;
  const secondsUntilReset = getSecondsUntilMidnight();

  // 1. Daily Quota Check in Redis
  const currentDailyRaw = await redis.get(dailyKey);
  const dailyCount = currentDailyRaw ? parseInt(currentDailyRaw, 10) : 0;

  if (dailyCount >= config.dailyQuota) {
    res.setHeader('Retry-After', String(secondsUntilReset));
    res.setHeader('X-Daily-Quota-Remaining', '0');
    return res.status(429).json({
      success: false,
      error: `Daily AI prompt quota (${config.dailyQuota} requests) exhausted. Quota resets at midnight.`,
      code: 'ERR_DAILY_AI_QUOTA_EXCEEDED',
      tier,
      dailyLimit: config.dailyQuota,
      dailyRemaining: 0,
      resetCountdownSeconds: secondsUntilReset,
      retryInSeconds: secondsUntilReset,
    });
  }

  // 2. Token Bucket Evaluation using Redis Lua Script
  let evalResult;
  try {
    evalResult = await redis.eval(
      REDIS_TOKEN_BUCKET_LUA,
      1,
      bucketKey,
      config.burstCapacity,
      config.refillRatePerSec,
      nowSec
    );
  } catch (luaErr) {
    // If eval fails, fall back to in-memory
    return handleInMemoryRateLimit(req, res, next, config, tier, userId);
  }

  const allowed = evalResult[0] === 1;
  const remainingTokens = evalResult[1];
  const retryAfter = evalResult[2];
  const resetTimestamp = Math.floor(nowSec + (allowed ? 0 : retryAfter));

  res.setHeader('X-RateLimit-Limit', String(config.hourlyLimit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remainingTokens)));
  res.setHeader('X-RateLimit-Reset', String(resetTimestamp));
  res.setHeader('X-Daily-Quota-Remaining', String(Math.max(0, config.dailyQuota - dailyCount - 1)));

  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: `Hourly AI rate limit exceeded for ${tier} tier. Please wait before retrying.`,
      code: 'ERR_AI_RATE_LIMIT_EXCEEDED',
      tier,
      limit: config.hourlyLimit,
      remaining: 0,
      retryAfter,
      retryInSeconds: retryAfter,
    });
  }

  // Increment daily usage in Redis atomically
  const newDaily = await redis.incr(dailyKey);
  if (newDaily === 1) {
    await redis.expire(dailyKey, secondsUntilReset + 3600);
  }

  // Hook into finish to record to usage ledger
  const startTime = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      recordAiUsageLog(req, res, Date.now() - startTime);
    }
  });

  return next();
}

/**
 * Synchronous in-memory token bucket and daily quota handler for offline/fallback/test modes.
 */
function handleInMemoryRateLimit(req, res, next, config, tier, userId) {
  const nowSec = Date.now() / 1000;
  const bucketKey = `${userId}:${tier}`;

  // 1. Daily Quota Check
  const today = getTodayDateKey();
  const dailyKey = `${userId}:${today}`;
  const dailyCount = inMemoryDailyUsage.get(dailyKey) || 0;
  const secondsUntilReset = getSecondsUntilMidnight();

  if (dailyCount >= config.dailyQuota) {
    res.setHeader('Retry-After', String(secondsUntilReset));
    res.setHeader('X-Daily-Quota-Remaining', '0');
    return res.status(429).json({
      success: false,
      error: `Daily AI prompt quota (${config.dailyQuota} requests) exhausted. Quota resets at midnight.`,
      code: 'ERR_DAILY_AI_QUOTA_EXCEEDED',
      tier,
      dailyLimit: config.dailyQuota,
      dailyRemaining: 0,
      resetCountdownSeconds: secondsUntilReset,
      retryInSeconds: secondsUntilReset,
    });
  }

  // 2. Token Bucket Burst & Rate Limiting
  let bucket = inMemoryBuckets.get(bucketKey);
  if (!bucket) {
    bucket = {
      tokens: config.burstCapacity,
      lastRefill: nowSec,
    };
  } else {
    // Calculate token refill since last request
    const deltaSec = Math.max(0, nowSec - bucket.lastRefill);
    const refilledTokens = deltaSec * config.refillRatePerSec;
    bucket.tokens = Math.min(config.burstCapacity, bucket.tokens + refilledTokens);
    bucket.lastRefill = nowSec;
  }

  // Set standard RFC 6585 rate limiting headers
  const remainingTokens = Math.max(0, Math.floor(bucket.tokens));
  const secondsForOneToken = Math.ceil((1 - Math.min(1, bucket.tokens)) / config.refillRatePerSec);
  const resetTimestamp = Math.floor(nowSec + Math.max(0, secondsForOneToken));

  res.setHeader('X-RateLimit-Limit', String(config.hourlyLimit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remainingTokens - 1)));
  res.setHeader('X-RateLimit-Reset', String(resetTimestamp));
  res.setHeader('X-Daily-Quota-Remaining', String(Math.max(0, config.dailyQuota - dailyCount - 1)));

  // Check if tokens are available (costs 1 token per request)
  if (bucket.tokens < 1.0) {
    const retryAfter = Math.max(1, Math.ceil((1.0 - bucket.tokens) / config.refillRatePerSec));
    res.setHeader('Retry-After', String(retryAfter));
    inMemoryBuckets.set(bucketKey, bucket);

    return res.status(429).json({
      success: false,
      error: `Hourly AI rate limit exceeded for ${tier} tier. Please wait before retrying.`,
      code: 'ERR_AI_RATE_LIMIT_EXCEEDED',
      tier,
      limit: config.hourlyLimit,
      remaining: 0,
      retryAfter,
      retryInSeconds: retryAfter,
    });
  }

  // Deduct 1 token and increment daily count
  bucket.tokens -= 1.0;
  inMemoryBuckets.set(bucketKey, bucket);
  inMemoryDailyUsage.set(dailyKey, dailyCount + 1);

  // Hook into finish to record to usage ledger
  const startTime = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      recordAiUsageLog(req, res, Date.now() - startTime);
    }
  });

  return next();
}

/**
 * Creates token bucket rate limiter middleware for AI endpoints.
 * 
 * @param {object} [customOptions]
 * @returns {import('express').RequestHandler}
 */
function aiRateLimiter(customOptions = {}) {
  return (req, res, next) => {
    // Determine user identity & tier
    const user = req.user || {};
    const userId = user.id || user.userId || req.ip || 'anonymous_user';
    const tier = (user.isPro || user.tier === 'pro' || req.headers['x-user-tier'] === 'pro') ? 'pro' : 'free';
    const config = TIER_CONFIGS[tier] || TIER_CONFIGS.free;

    if (
      redisService &&
      redisService.isReady &&
      redisService.client &&
      process.env.NODE_ENV !== 'test'
    ) {
      return handleRedisRateLimit(req, res, next, config, tier, userId).catch(() => {
        return handleInMemoryRateLimit(req, res, next, config, tier, userId);
      });
    }

    return handleInMemoryRateLimit(req, res, next, config, tier, userId);
  };
}

module.exports = {
  aiRateLimiter,
  TIER_CONFIGS,
  inMemoryBuckets,
  inMemoryDailyUsage,
  getSecondsUntilMidnight,
};
