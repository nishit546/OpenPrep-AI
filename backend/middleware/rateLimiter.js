const crypto = require('crypto');
const rateLimitTiers = require('../config/rateLimitTiers');
const redisService = require('../services/redisService');
const logger = require('../utils/logger');
const { SquadMember } = require('../models');

// In-Memory Backup Store for Fallback Mode
const memoryStore = new Map();

let luaRegistered = false;

/**
 * Registers the Token Bucket rate limit Lua script on the Redis client.
 */
function registerLuaScript(client) {
  if (luaRegistered) return;
  try {
    client.defineCommand('tokenBucketRateLimit', {
      numberOfKeys: 1,
      lua: `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local data = redis.call('HMGET', key, 'tokens', 'last_update')
        local tokens = tonumber(data[1])
        local last_update = tonumber(data[2])

        if not tokens then
          tokens = capacity
          last_update = now
        else
          local elapsed = now - last_update
          if elapsed > 0 then
            local refilled = elapsed * refill_rate
            tokens = math.min(capacity, tokens + refilled)
            last_update = now
          end
        end

        local allowed = 0
        if tokens >= requested then
          allowed = 1
          tokens = tokens - requested
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_update', last_update)
        redis.call('EXPIRE', key, 3600)

        local time_to_reset = 0
        if tokens < capacity and refill_rate > 0 then
          time_to_reset = math.ceil((capacity - tokens) / refill_rate) / 1000
        end

        return { allowed, math.floor(tokens), time_to_reset }
      `,
    });
    luaRegistered = true;
  } catch (err) {
    logger.error('Failed to define Redis Lua tokenBucketRateLimit command:', err);
  }
}

/**
 * Returns the ready Redis client and registers the custom command.
 */
function getRedisClient() {
  if (redisService.isReady && redisService.client) {
    registerLuaScript(redisService.client);
    return redisService.client;
  }
  return null;
}

/**
 * Local in-memory fallback implementation of the Token Bucket algorithm.
 */
function handleMemoryRateLimit(key, capacity, refillRate, now) {
  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { tokens: capacity, lastUpdate: now };
  } else {
    const elapsed = now - entry.lastUpdate;
    if (elapsed > 0) {
      entry.tokens = Math.min(capacity, entry.tokens + elapsed * refillRate);
      entry.lastUpdate = now;
    }
  }

  let allowed = false;
  if (entry.tokens >= 1) {
    allowed = true;
    entry.tokens -= 1;
  }

  memoryStore.set(key, entry);

  const timeToReset = refillRate > 0 ? (capacity - entry.tokens) / refillRate : 0;

  // Cleanup map regularly if it gets too large
  if (memoryStore.size > 10000) {
    for (const [k, v] of memoryStore.entries()) {
      if (now - v.lastUpdate > 3600000) {
        memoryStore.delete(k);
      }
    }
  }

  return {
    allowed,
    remaining: Math.floor(entry.tokens),
    timeToReset: Math.ceil(timeToReset / 1000), // in seconds
  };
}

/**
 * Skip limiting in ordinary test runs, but let the dedicated rate-limit suites
 * opt back in with the `x-test-rate-limit` header.
 */
const shouldSkip = (req) =>
  process.env.NODE_ENV === 'test' && !req?.headers?.['x-test-rate-limit'];

/**
 * Checks if the request is targeting an AI generation endpoint.
 */
function isAiEndpoint(req) {
  const path = req.originalUrl || req.path || '';
  return (
    path.includes('/api/ai/') ||
    path.includes('/api/viva') ||
    path.includes('/api/quiz/evaluate-subjective') ||
    path.includes('/api/quizzes/evaluate-subjective')
  );
}

/**
 * Helper to determine if a student user is a moderator or admin in any Study Squad.
 * Caches boolean value in Redis for 5 minutes.
 */
async function checkIfUserIsModeratorOrAdmin(user) {
  if (user.role === 'admin') return true;

  const client = getRedisClient();
  const cacheKey = `user:${user.id}:is_mod_or_admin`;

  if (client) {
    try {
      const cached = await client.get(cacheKey);
      if (cached !== null) {
        return cached === 'true';
      }
    } catch (e) {
      // ignore cache check errors
    }
  }

  const membership = await SquadMember.findOne({
    where: {
      userId: user.id,
      role: ['moderator', 'admin'],
    },
  });

  const isMod = !!membership;

  if (client) {
    try {
      await client.set(cacheKey, isMod ? 'true' : 'false', 'EX', 300);
    } catch (e) {
      // ignore cache set errors
    }
  }

  return isMod;
}

/**
 * Helper to build custom standalone rate limiters (e.g. for specific routes).
 */
function createTokenBucketLimiter({ capacity, refillRate, prefix, errorResponse }) {
  return async (req, res, next) => {
    if (shouldSkip(req)) return next();

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown-ua';
    
    const identifier = req.user && req.user.id
      ? `user:${req.user.id}`
      : `guest:${crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex')}`;

    const key = `ratelimit:${prefix}:${identifier}`;
    const now = Date.now();

    const client = getRedisClient();
    if (client) {
      try {
        const [allowed, remaining, timeToReset] = await client.tokenBucketRateLimit(
          key,
          capacity,
          refillRate,
          1,
          now
        );

        res.setHeader('X-RateLimit-Limit', capacity);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + timeToReset * 1000) / 1000));

        if (!allowed) {
          const retryAfter = Math.max(1, timeToReset);
          res.setHeader('Retry-After', retryAfter);

          let payload = {};
          if (typeof errorResponse === 'object') {
            payload = { ...errorResponse };
            if (payload.retryInSeconds === undefined) {
              payload.retryInSeconds = retryAfter;
            }
          } else {
            payload = {
              success: false,
              error: errorResponse || 'Rate limit exceeded',
              retryInSeconds: retryAfter,
            };
          }
          return res.status(429).json(payload);
        }

        return next();
      } catch (err) {
        logger.error(`[RateLimiter] Redis command error for prefix ${prefix}:`, err.message);
      }
    }

    // Fall back to memory
    const result = handleMemoryRateLimit(key, capacity, refillRate, now);
    res.setHeader('X-RateLimit-Limit', capacity);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + result.timeToReset * 1000) / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.timeToReset);
      
      let payload = {};
      if (typeof errorResponse === 'object') {
        payload = { ...errorResponse };
        if (payload.retryInSeconds === undefined) {
          payload.retryInSeconds = result.timeToReset;
        }
      } else {
        payload = {
          success: false,
          error: errorResponse || 'Rate limit exceeded',
          retryInSeconds: result.timeToReset,
        };
      }
      return res.status(429).json(payload);
    }

    return next();
  };
}

/**
 * High-Performance Tiered Rate Limiter Middleware
 */
async function rateLimiterMiddleware(req, res, next) {
  if (shouldSkip(req)) return next();

  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'unknown-ua';
  const now = Date.now();

  const isAi = isAiEndpoint(req);

  // 1. Resolve Tier Config & Partitions
  let config;
  let keyPrefix;
  let identifier;

  if (!req.user) {
    // Unauthenticated Guest
    if (isAi) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'AI features are locked for guests. Please register or log in.',
      });
    }
    config = rateLimitTiers.guest.general;
    keyPrefix = 'general';
    const hash = crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
    identifier = `guest:${hash}`;
  } else {
    // Authenticated User
    const isModOrAdmin = await checkIfUserIsModeratorOrAdmin(req.user);
    const tier = isModOrAdmin ? rateLimitTiers.moderator_admin : rateLimitTiers.student;
    
    if (isAi) {
      config = tier.ai;
      keyPrefix = 'ai';
    } else {
      config = tier.general;
      keyPrefix = 'general';
    }
    identifier = `user:${req.user.id}`;
  }

  const trackingKey = `ratelimit:${keyPrefix}:${identifier}`;
  const client = getRedisClient();

  if (client) {
    try {
      const [allowed, remaining, timeToReset] = await client.tokenBucketRateLimit(
        trackingKey,
        config.capacity,
        config.refillRate,
        1,
        now
      );

      res.setHeader('X-RateLimit-Limit', config.capacity);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + timeToReset * 1000) / 1000));

      if (!allowed) {
        const retryAfter = Math.max(1, timeToReset);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        });
      }

      return next();
    } catch (err) {
      logger.error('[RateLimiter] Redis error executing rateLimit command:', err.message);
    }
  }

  // Fallback to local memory token bucket
  const result = handleMemoryRateLimit(trackingKey, config.capacity, config.refillRate, now);
  res.setHeader('X-RateLimit-Limit', config.capacity);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil((now + result.timeToReset * 1000) / 1000));

  if (!result.allowed) {
    res.setHeader('Retry-After', result.timeToReset);
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded (In-Memory Fallback). Please try again in ${result.timeToReset} seconds.`,
      retryAfter: result.timeToReset,
    });
  }

  return next();
}

// ----------------------------------------------------
// Named Route-Specific Limiters (adapted to new Engine)
// ----------------------------------------------------

/**
 * AI endpoint limiter — 10 requests / 15 minutes.
 */
const aiLimiter = createTokenBucketLimiter({
  capacity: 10,
  refillRate: 10 / (15 * 60 * 1000), // 10 tokens per 15 minutes
  prefix: 'ai_specific',
  errorResponse: {
    success: false,
    error: 'AI rate limit exceeded',
    remainingQuota: 0,
  },
});

/**
 * Upload-and-analyse limiter — 5 requests / minute.
 */
const strictAiLimiter = createTokenBucketLimiter({
  capacity: 5,
  refillRate: 5 / (60 * 1000), // 5 tokens per 1 minute
  prefix: 'strict_ai_specific',
  errorResponse: {
    success: false,
    error: 'Too many AI analysis requests. Please wait a moment before uploading more files.',
  },
});

/**
 * Auth email limiter — 3 requests / 15 minutes.
 */
const authEmailLimiter = createTokenBucketLimiter({
  capacity: 3,
  refillRate: 3 / (15 * 60 * 1000), // 3 tokens per 15 minutes
  prefix: 'auth_email_specific',
  errorResponse: {
    success: false,
    error: 'Too many requests. Please try again after 15 minutes.',
  },
});

/**
 * Exported as callable middleware.
 */
const rateLimiterMiddlewareCallable = (req, res, next) => {
  return rateLimiterMiddleware(req, res, next);
};

// Bind named limiters as properties of the main function object
rateLimiterMiddlewareCallable.aiLimiter = aiLimiter;
rateLimiterMiddlewareCallable.strictAiLimiter = strictAiLimiter;
rateLimiterMiddlewareCallable.authEmailLimiter = authEmailLimiter;

module.exports = rateLimiterMiddlewareCallable;
