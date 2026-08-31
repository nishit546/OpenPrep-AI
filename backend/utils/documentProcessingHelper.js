const DocumentProcessingPipelineService = require('../services/documentProcessingPipelineService');
const logger = require('./logger');

/**
 * Wrapper for executing a pipeline stage with error handling
 */
class DocumentProcessingHelper {
  static async executeStageWithErrorHandling(
    stageId,
    stageHandler,
    documentId,
    input = null
  ) {
    try {
      // Mark stage as started
      await DocumentProcessingPipelineService.startStage(stageId, input);

      // Execute the stage handler
      const result = await stageHandler(input);

      // Mark stage as completed with output
      await DocumentProcessingPipelineService.completeStage(stageId, result);

      return result;
    } catch (error) {
      logger.error(`Stage execution failed: ${error.message}`);
      // Mark stage as failed - will be retried by background job
      await DocumentProcessingPipelineService.failStage(stageId, error, true);
      throw error;
    }
  }

  /**
   * Get next stage output for use in subsequent stages
   */
  static async getStageOutput(documentId, stageName) {
    const stages = await DocumentProcessingPipelineService.getPipelineStages(documentId);
    const stage = stages.find(s => s.stageName === stageName);

    if (!stage || stage.status !== 'completed') {
      return null;
    }

    try {
      return typeof stage.output === 'string' ? JSON.parse(stage.output) : stage.output;
    } catch {
      return stage.output;
    }
  }

  /**
   * Check if document can proceed to next stage
   */
  static async canProceedToNextStage(documentId, currentStageName) {
    const stages = await DocumentProcessingPipelineService.getPipelineStages(documentId);
    const currentStageIndex = stages.findIndex(s => s.stageName === currentStageName);

    if (currentStageIndex === -1) return false;

    // All previous stages must be completed or skipped
    const previousStages = stages.slice(0, currentStageIndex);
    return previousStages.every(s => s.status === 'completed' || s.status === 'skipped');
  }

  /**
   * Get stage by document and stage name
   */
  static async getStageByName(documentId, stageName) {
    const stages = await DocumentProcessingPipelineService.getPipelineStages(documentId);
    return stages.find(s => s.stageName === stageName);
  }
}

module.exports = DocumentProcessingHelper;