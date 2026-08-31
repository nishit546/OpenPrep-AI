const cron = require('node-cron');
const AIGenerationCacheService = require('../services/aiGenerationCacheService');
const logger = require('../utils/logger');

/**
 * Clear expired cache entries every hour
 */
const initializeCacheCleanupCron = () => {
  // Run every hour at the 0th minute
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running cache cleanup job...');
      const cleaned = await AIGenerationCacheService.clearExpiredCache();
      logger.info(`Cache cleanup completed: removed ${cleaned} entries`);
    } catch (error) {
      logger.error(`Cache cleanup failed: ${error.message}`);
    }
  });
};

module.exports = { initializeCacheCleanupCron };