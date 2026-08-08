const cacheService = require('../services/cacheService');

const cacheMiddleware = (keyGenerator, ttlSeconds = parseInt(process.env.CACHE_TTL, 10) || 3600) => {
  return async (req, res, next) => {
    const key = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;

    try {
      const cachedData = await cacheService.get(key);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.json({ success: true, ...cachedData });
      }

      const originalJson = res.json;
      res.json = function (body) {
        if (body && body.success) {
          const { success, ...rest } = body;
          cacheService.set(key, rest, ttlSeconds).catch(() => {});
          res.setHeader('X-Cache', 'MISS');
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      res.setHeader('X-Cache', 'MISS');
      next();
    }
  };
};

module.exports = cacheMiddleware;
