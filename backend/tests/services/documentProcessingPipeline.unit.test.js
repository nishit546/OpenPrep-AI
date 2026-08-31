const DocumentProcessingPipelineService = require('../../services/documentProcessingPipelineService');
const DocumentProcessingStage = require('../../models/DocumentProcessingStage');
const uuid = require('uuid');

describe('DocumentProcessingPipelineService', () => {
  const documentId = uuid.v4();
  const userId = uuid.v4();

  describe('initializePipeline', () => {
    it('should create all 5 stages for a document', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);

      expect(stages.length).toBe(5);
      expect(stages[0].stageName).toBe('file-validation');
      expect(stages[4].stageName).toBe('result-persistence');
      expect(stages.every(s => s.status === 'pending')).toBe(true);
    });
  });

  describe('completeStage', () => {
    it('should mark stage as completed with output', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);
      const stageId = stages[0].id;

      await DocumentProcessingPipelineService.completeStage(stageId, { isValid: true });
      const updated = await DocumentProcessingStage.findByPk(stageId);

      expect(updated.status).toBe('completed');
      expect(updated.output).toEqual({ isValid: true });
      expect(updated.completedAt).not.toBeNull();
    });
  });

  describe('failStage', () => {
    it('should mark stage as failed with error', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);
      const stageId = stages[0].id;

      const error = new Error('Validation failed');
      await DocumentProcessingPipelineService.failStage(stageId, error);
      const updated = await DocumentProcessingStage.findByPk(stageId);

      expect(updated.status).toBe('failed');
      expect(updated.error.message).toBe('Validation failed');
    });

    it('should schedule retry with exponential backoff', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);
      const stageId = stages[0].id;

      const error = new Error('Extraction failed');
      await DocumentProcessingPipelineService.failStage(stageId, error, true);
      const updated = await DocumentProcessingStage.findByPk(stageId);

      expect(updated.retryScheduledFor).not.toBeNull();
      expect(updated.retryScheduledFor.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getPipelineStatus', () => {
    it('should show overall progress', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);

      // Complete first 2 stages
      await DocumentProcessingPipelineService.completeStage(stages[0].id);
      await DocumentProcessingPipelineService.completeStage(stages[1].id);

      const status = await DocumentProcessingPipelineService.getPipelineStatus(documentId);

      expect(status.progress.completed).toBe(2);
      expect(status.progress.pending).toBe(3);
      expect(status.progress.percentage).toBe(40);
      expect(status.overallStatus).toBe('in-progress');
    });
  });

  describe('skipStage', () => {
    it('should skip a stage with reason', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);

      await DocumentProcessingPipelineService.skipStage(stages[1].id, 'Text already extracted');
      const updated = await DocumentProcessingStage.findByPk(stages[1].id);

      expect(updated.status).toBe('skipped');
      expect(updated.metadata.skippedReason).toBe('Text already extracted');
    });
  });

  describe('resetStageForRetry', () => {
    it('should reset failed stage to pending', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);
      const stageId = stages[0].id;

      // Fail the stage first
      await DocumentProcessingPipelineService.failStage(stageId, new Error('Test error'));

      // Reset for retry
      await DocumentProcessingPipelineService.resetStageForRetry(stageId);
      const updated = await DocumentProcessingStage.findByPk(stageId);

      expect(updated.status).toBe('pending');
      expect(updated.retryScheduledFor).toBeNull();
    });
  });

  describe('isPipelineComplete', () => {
    it('should return true when all stages completed', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);

      // Complete all stages
      for (const stage of stages) {
        await DocumentProcessingPipelineService.completeStage(stage.id);
      }

      const isComplete = await DocumentProcessingPipelineService.isPipelineComplete(documentId);
      expect(isComplete).toBe(true);
    });

    it('should return false when some stages pending', async () => {
      const stages = await DocumentProcessingPipelineService.initializePipeline(documentId, userId);
      await DocumentProcessingPipelineService.completeStage(stages[0].id);

      const isComplete = await DocumentProcessingPipelineService.isPipelineComplete(documentId);
      expect(isComplete).toBe(false);
    });
  });
});