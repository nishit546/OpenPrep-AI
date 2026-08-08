const NodeCache = require('node-cache');
const redisService = require('./redisService');

const DEFAULT_TTL_SECONDS = parseInt(process.env.CACHE_TTL, 10) || 3600;
const MAX_KEYS = parseInt(process.env.CACHE_MAX_KEYS, 10) || 1000;

const localCache = new NodeCache({
  stdTTL: DEFAULT_TTL_SECONDS,
  checkperiod: Math.max(60, Math.floor(DEFAULT_TTL_SECONDS / 2)),
  maxKeys: MAX_KEYS,
  useClones: true,
});

const escapePattern = (pattern) =>
  pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');

class CacheService {
  async get(key) {
    if (redisService.isReady) {
      const data = await redisService.get(key);
      if (data !== null) {
        return data;
      }
    }
    return localCache.get(key) || null;
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (redisService.isReady) {
      await redisService.set(key, value, ttlSeconds);
      return;
    }
    localCache.set(key, value, ttlSeconds);
  }

  async del(patterns) {
    if (!patterns) return;
    const patternList = Array.isArray(patterns) ? patterns : [patterns];

    if (redisService.isReady) {
      await Promise.all(patternList.map((pattern) => redisService.del(pattern)));
      return;
    }

    const keys = localCache.keys();
    for (const pattern of patternList) {
      const regex = new RegExp(`^${escapePattern(pattern)}$`);
      const matched = keys.filter((key) => regex.test(key));
      if (matched.length > 0) {
        localCache.del(matched);
      }
    }
  }
}

module.exports = new CacheService();
