const AIContractVersioningService = require('../../services/aiContractVersioningService');
const AIWorkflowContract = require('../../models/AIWorkflowContract');

describe('AIContractVersioningService', () => {
  describe('registerContract', () => {
    it('should create contract with version 1 for new workflow', async () => {
      const contract = await AIContractVersioningService.registerContract(
        'quiz-generation',
        'Generate a quiz...',
        { type: 'object', properties: { questions: { type: 'array' } } },
        { temperature: 0.7, maxTokens: 2000 },
        'json-strict'
      );

      expect(contract.version).toBe(1);
      expect(contract.isActive).toBe(true);
    });

    it('should increment version for existing workflow', async () => {
      const v1 = await AIContractVersioningService.registerContract(
        'study-plan',
        'Template 1',
        { type: 'object' },
        { temperature: 0.5 },
        'json-strict'
      );

      const v2 = await AIContractVersioningService.registerContract(
        'study-plan',
        'Template 2',
        { type: 'object' },
        { temperature: 0.6 },
        'json-strict'
      );

      expect(v2.version).toBe(v1.version + 1);
    });
  });

  describe('validateResponseSchema', () => {
    it('should validate response against schema', () => {
      const schema = {
        type: 'object',
        properties: {
          questions: { type: 'array' },
        },
        required: ['questions'],
      };

      const validResponse = { questions: [] };
      const result = AIContractVersioningService.validateResponseSchema(validResponse, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
    });

    it('should reject invalid response', () => {
      const schema = {
        type: 'object',
        properties: { questions: { type: 'array' } },
        required: ['questions'],
      };

      const invalidResponse = { wrongField: 'value' };
      const result = AIContractVersioningService.validateResponseSchema(invalidResponse, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});