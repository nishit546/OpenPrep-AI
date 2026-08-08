const cacheService = require('../services/cacheService');

const clearCache = (keyPatternGen) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const pattern = typeof keyPatternGen === 'function' ? keyPatternGen(req) : keyPatternGen;
        await cacheService.del(pattern).catch(() => {});
      }
    });
    next();
  };
};

module.exports = clearCache;
