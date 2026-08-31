const DocumentProcessingPipelineService = require('../services/documentProcessingPipelineService');
const logger = require('../utils/logger');

/**
 * Get pipeline status for a document
 */
exports.getPipelineStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    const status = await DocumentProcessingPipelineService.getPipelineStatus(documentId);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error(`Pipeline status error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get processing history for a document
 */
exports.getProcessingHistory = async (req, res) => {
  try {
    const { documentId } = req.params;
    const history = await DocumentProcessingPipelineService.getProcessingHistory(documentId);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error(`Processing history error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Retry a failed stage
 */
exports.retryFailedStage = async (req, res) => {
  try {
    const { documentId, stageName } = req.params;
    const stages = await DocumentProcessingPipelineService.getPipelineStages(documentId);
    const stage = stages.find(s => s.stageName === stageName);

    if (!stage || stage.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Stage not found or not in failed state',
      });
    }

    await DocumentProcessingPipelineService.resetStageForRetry(stage.id);
    res.json({ success: true, message: 'Stage scheduled for retry' });
  } catch (error) {
    logger.error(`Stage retry error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Restart entire pipeline from the beginning
 */
exports.restartPipeline = async (req, res) => {
  try {
    const { documentId } = req.params;
    const stages = await DocumentProcessingPipelineService.getPipelineStages(documentId);

    // Reset all stages to pending
    await Promise.all(
      stages.map(stage =>
        DocumentProcessingPipelineService.resetStageForRetry(stage.id)
      )
    );

    res.json({ success: true, message: 'Pipeline restarted from beginning' });
  } catch (error) {
    logger.error(`Pipeline restart error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};