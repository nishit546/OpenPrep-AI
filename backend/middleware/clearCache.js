const redisService = require('../services/redisService');

const clearCache = (keyPatternGen) => {
  return (req, res, next) => {
    // We attach an event listener to the response finish event
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (redisService.isReady) {
          const pattern = typeof keyPatternGen === 'function' ? keyPatternGen(req) : keyPatternGen;
          await redisService.del(pattern);
        }
      }
    });
    next();
  };
};

module.exports = clearCache;
