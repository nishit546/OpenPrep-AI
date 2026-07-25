const redisService = require('../services/redisService');

const cacheMiddleware = (keyGenerator, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // If Redis is not connected, just skip caching entirely
    if (!redisService.isReady) {
      return next();
    }

    const key = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;

    try {
      const cachedData = await redisService.get(key);
      if (cachedData) {
        return res.json({ success: true, ...cachedData });
      }

      // Intercept res.json to cache the response before sending it
      const originalJson = res.json;
      res.json = function (body) {
        if (body && body.success) {
          // We only cache the data payload, but strip success so it doesn't get nested if we want.
          // Actually, caching the whole body minus success is fine, or just cache the whole body.
          const { success, ...rest } = body;
          redisService.set(key, rest, ttlSeconds);
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      next();
    }
  };
};

module.exports = cacheMiddleware;
