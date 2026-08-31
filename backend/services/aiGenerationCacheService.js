const crypto = require('crypto');
const AIGenerationCache = require('../models/AIGenerationCache');
const logger = require('../utils/logger');

class AIGenerationCacheService {
  /**
   * Generate fingerprint from generation inputs
   * Includes: content, parameters, workflow version, model config
   */
  static generateFingerprint(workflowType, inputs) {
    try {
      const fingerprintData = {
        workflowType,
        content: inputs.content ? this.normalizeContent(inputs.content) : null,
        parameters: inputs.parameters || {},
        contractVersion: inputs.contractVersion,
        modelConfig: inputs.modelConfig || {},
        settings: inputs.settings || {},
      };

      const jsonString = JSON.stringify(fingerprintData);
      const fingerprint = crypto.createHash('sha256').update(jsonString).digest('hex');

      return {
        fingerprint,
        inputHash: fingerprintData,
      };
    } catch (error) {
      logger.error(`Fingerprint generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normalize content for consistent fingerprinting
   */
  static normalizeContent(content) {
    if (typeof content === 'string') {
      return content
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' '); // Normalize whitespace
    }
    if (Array.isArray(content)) {
      return content.map(item => this.normalizeContent(item));
    }
    if (typeof content === 'object') {
      const normalized = {};
      for (const key of Object.keys(content).sort()) {
        normalized[key] = this.normalizeContent(content[key]);
      }
      return normalized;
    }
    return content;
  }

  /**
   * Get cached result if exists and is valid
   */
  static async getCachedResult(fingerprint, userId, contractVersion) {
    try {
      const cached = await AIGenerationCache.findOne({
        where: {
          fingerprint,
          userId,
          contractVersion,
        },
      });

      if (!cached) {
        return null;
      }

      // Check expiration
      if (cached.expiresAt && new Date() > new Date(cached.expiresAt)) {
        await this.invalidateCache(fingerprint);
        return null;
      }

      // Update access tracking
      await cached.update({
        accessCount: cached.accessCount + 1,
        lastAccessedAt: new Date(),
      });

      logger.info(`Cache hit for fingerprint: ${fingerprint}`);
      return {
        result: cached.generatedResult,
        metadata: cached.resultMetadata,
        cacheId: cached.id,
      };
    } catch (error) {
      logger.error(`Cache retrieval failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Store generation result in cache
   */
  static async cacheResult(
    fingerprint,
    workflowType,
    userId,
    contractVersion,
    inputHash,
    generatedResult,
    resultMetadata = null,
    ttlHours = 24
  ) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      const cacheEntry = await AIGenerationCache.create({
        fingerprint,
        workflowType,
        userId,
        contractVersion,
        inputHash,
        generatedResult,
        resultMetadata,
        expiresAt,
      });

      logger.info(`Result cached with fingerprint: ${fingerprint}`);
      return cacheEntry;
    } catch (error) {
      logger.error(`Cache storage failed: ${error.message}`);
      // Don't throw - caching should not break generation
      return null;
    }
  }

  /**
   * Invalidate cache when version changes
   */
  static async invalidateByWorkflowVersion(workflowType, oldVersion) {
    try {
      const result = await AIGenerationCache.destroy({
        where: {
          workflowType,
          contractVersion: oldVersion,
        },
      });

      logger.info(`Invalidated ${result} cache entries for ${workflowType} v${oldVersion}`);
      return result;
    } catch (error) {
      logger.error(`Cache invalidation failed: ${error.message}`);
    }
  }

  /**
   * Invalidate single cache entry
   */
  static async invalidateCache(fingerprint) {
    try {
      const result = await AIGenerationCache.destroy({
        where: { fingerprint },
      });

      logger.info(`Cache invalidated for fingerprint: ${fingerprint}`);
      return result;
    } catch (error) {
      logger.error(`Cache invalidation failed: ${error.message}`);
    }
  }

  /**
   * Clear expired cache entries (run periodically)
   */
  static async clearExpiredCache() {
    try {
      const result = await AIGenerationCache.destroy({
        where: {
          expiresAt: {
            [require('sequelize').Op.lt]: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${result} expired cache entries`);
      return result;
    } catch (error) {
      logger.error(`Cache cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(userId) {
    try {
      const stats = await AIGenerationCache.findAll({
        where: { userId },
        attributes: [
          'workflowType',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').col('accessCount')), 'totalHits'],
        ],
        group: ['workflowType'],
        raw: true,
      });

      return stats;
    } catch (error) {
      logger.error(`Cache stats retrieval failed: ${error.message}`);
      return [];
    }
  }
}

module.exports = AIGenerationCacheService;