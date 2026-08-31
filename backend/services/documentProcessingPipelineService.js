const DocumentProcessingStage = require('../models/DocumentProcessingStage');
const DocumentProcessingLog = require('../models/DocumentProcessingLog');
const logger = require('../utils/logger');

const PIPELINE_STAGES = [
  { name: 'file-validation', order: 1 },
  { name: 'text-extraction', order: 2 },
  { name: 'content-normalization', order: 3 },
  { name: 'ai-analysis', order: 4 },
  { name: 'result-persistence', order: 5 },
];

class DocumentProcessingPipelineService {
  /**
   * Initialize pipeline stages for a document
   */
  static async initializePipeline(documentId, userId) {
    try {
      const stages = await Promise.all(
        PIPELINE_STAGES.map(stage =>
          DocumentProcessingStage.create({
            documentId,
            userId,
            stageName: stage.name,
            stageOrder: stage.order,
            status: 'pending',
          })
        )
      );

      await this.logEvent(documentId, stages[0].id, 'started', 'Pipeline initialized');
      logger.info(`Pipeline initialized for document: ${documentId}`);
      return stages;
    } catch (error) {
      logger.error(`Pipeline initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all stages for a document
   */
  static async getPipelineStages(documentId) {
    return DocumentProcessingStage.findAll({
      where: { documentId },
      order: [['stageOrder', 'ASC']],
    });
  }

  /**
   * Get the next stage to process (first pending or failed stage)
   */
  static async getNextStage(documentId) {
    const stage = await DocumentProcessingStage.findOne({
      where: {
        documentId,
        status: ['pending', 'failed'],
      },
      order: [['stageOrder', 'ASC']],
    });

    return stage;
  }

  /**
   * Mark stage as in progress
   */
  static async startStage(stageId, input = null) {
    try {
      const stage = await DocumentProcessingStage.findByPk(stageId);
      if (!stage) throw new Error(`Stage not found: ${stageId}`);

      await stage.update({
        status: 'in-progress',
        attemptCount: stage.attemptCount + 1,
        startedAt: new Date(),
        input: input || stage.input,
      });

      await this.logEvent(stage.documentId, stageId, 'started', `Attempt #${stage.attemptCount + 1}`);
      return stage;
    } catch (error) {
      logger.error(`Failed to start stage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark stage as completed with output
   */
  static async completeStage(stageId, output = null, metadata = null) {
    try {
      const stage = await DocumentProcessingStage.findByPk(stageId);
      if (!stage) throw new Error(`Stage not found: ${stageId}`);

      await stage.update({
        status: 'completed',
        completedAt: new Date(),
        output: output || stage.output,
        metadata,
      });

      await this.logEvent(stage.documentId, stageId, 'completed', 'Stage completed successfully');
      logger.info(`Stage completed: ${stage.stageName} for document ${stage.documentId}`);
      return stage;
    } catch (error) {
      logger.error(`Failed to complete stage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark stage as failed with error details
   */
  static async failStage(stageId, error, scheduleRetry = true) {
    try {
      const stage = await DocumentProcessingStage.findByPk(stageId);
      if (!stage) throw new Error(`Stage not found: ${stageId}`);

      const errorDetails = {
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date(),
      };

      let retryScheduledFor = null;
      let status = 'failed';

      if (scheduleRetry && stage.attemptCount < stage.maxAttempts) {
        // Schedule retry with exponential backoff: 1min, 5min, 15min
        const backoffMs = Math.pow(5, stage.attemptCount) * 60000;
        retryScheduledFor = new Date(Date.now() + backoffMs);
        status = 'failed';
      }

      await stage.update({
        status,
        error: errorDetails,
        retryScheduledFor,
      });

      await this.logEvent(stage.documentId, stageId, 'failed', error.message, errorDetails);
      logger.error(`Stage failed: ${stage.stageName} - ${error.message}`);
      return stage;
    } catch (error) {
      logger.error(`Failed to record stage failure: ${error.message}`);
      throw error;
    }
  }

  /**
   * Skip a stage (e.g., when document already has extracted text)
   */
  static async skipStage(stageId, reason = null) {
    try {
      const stage = await DocumentProcessingStage.findByPk(stageId);
      if (!stage) throw new Error(`Stage not found: ${stageId}`);

      await stage.update({
        status: 'skipped',
        completedAt: new Date(),
        metadata: { skippedReason: reason },
      });

      await this.logEvent(stage.documentId, stageId, 'skipped', reason || 'Stage skipped');
      return stage;
    } catch (error) {
      logger.error(`Failed to skip stage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pipeline status for a document
   */
  static async getPipelineStatus(documentId) {
    try {
      const stages = await this.getPipelineStages(documentId);
      const completed = stages.filter(s => s.status === 'completed').length;
      const failed = stages.filter(s => s.status === 'failed').length;
      const pending = stages.filter(s => s.status === 'pending').length;

      const overallStatus = failed > 0 ? 'failed' : pending > 0 ? 'in-progress' : 'completed';

      return {
        documentId,
        overallStatus,
        progress: {
          completed,
          failed,
          pending,
          total: stages.length,
          percentage: Math.round((completed / stages.length) * 100),
        },
        stages: stages.map(s => ({
          name: s.stageName,
          status: s.status,
          attemptCount: s.attemptCount,
          error: s.error,
          completedAt: s.completedAt,
        })),
      };
    } catch (error) {
      logger.error(`Failed to get pipeline status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if all stages are completed
   */
  static async isPipelineComplete(documentId) {
    const stages = await this.getPipelineStages(documentId);
    return stages.every(s => s.status === 'completed' || s.status === 'skipped');
  }

  /**
   * Log event for audit trail
   */
  static async logEvent(documentId, stageId, eventType, message, details = null) {
    try {
      await DocumentProcessingLog.create({
        documentId,
        stageId,
        eventType,
        message,
        details,
      });
    } catch (error) {
      logger.error(`Failed to log event: ${error.message}`);
    }
  }

  /**
   * Get processing history for a document
   */
  static async getProcessingHistory(documentId) {
    return DocumentProcessingLog.findAll({
      where: { documentId },
      order: [['timestamp', 'DESC']],
    });
  }

  /**
   * Get all stages pending retry (for background job)
   */
  static async getStagesPendingRetry(limit = 100) {
    return DocumentProcessingStage.findAll({
      where: {
        status: 'failed',
        retryScheduledFor: {
          [require('sequelize').Op.lte]: new Date(),
        },
      },
      limit,
      order: [['retryScheduledFor', 'ASC']],
    });
  }

  /**
   * Reset a specific stage for retry
   */
  static async resetStageForRetry(stageId) {
    try {
      const stage = await DocumentProcessingStage.findByPk(stageId);
      if (!stage) throw new Error(`Stage not found: ${stageId}`);

      await stage.update({
        status: 'pending',
        retryScheduledFor: null,
        startedAt: null,
        completedAt: null,
      });

      await this.logEvent(stage.documentId, stageId, 'retried', 'Stage reset for retry');
      return stage;
    } catch (error) {
      logger.error(`Failed to reset stage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check for duplicate processing (same document already in pipeline)
   */
  static async isDocumentBeingProcessed(documentId) {
    const inProgress = await DocumentProcessingStage.findOne({
      where: {
        documentId,
        status: 'in-progress',
      },
    });

    return !!inProgress;
  }
}

module.exports = DocumentProcessingPipelineService;