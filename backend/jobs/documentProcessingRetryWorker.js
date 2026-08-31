const cron = require('node-cron');
const DocumentProcessingPipelineService = require('../services/documentProcessingPipelineService');
const logger = require('../utils/logger');

/**
 * Background job to retry failed stages scheduled for retry
 * Runs every 5 minutes
 */
const initializeDocumentProcessingRetryWorker = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Document processing retry worker started');
      const stagesToRetry = await DocumentProcessingPipelineService.getStagesPendingRetry(50);

      for (const stage of stagesToRetry) {
        try {
          await DocumentProcessingPipelineService.resetStageForRetry(stage.id);
          logger.info(`Scheduled retry for stage: ${stage.stageName} of document: ${stage.documentId}`);
        } catch (error) {
          logger.error(`Failed to schedule retry: ${error.message}`);
        }
      }

      logger.info(`Document processing retry worker completed: ${stagesToRetry.length} stages scheduled`);
    } catch (error) {
      logger.error(`Document processing retry worker failed: ${error.message}`);
    }
  });
};

module.exports = { initializeDocumentProcessingRetryWorker };