const AIGenerationCacheService = require('../../services/aiGenerationCacheService');

describe('AIGenerationCacheService', () => {
  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint for same inputs', () => {
      const inputs = {
        content: 'Test content',
        parameters: { difficulty: 'easy' },
        contractVersion: 1,
        modelConfig: { temperature: 0.7 },
      };

      const fp1 = AIGenerationCacheService.generateFingerprint('quiz-generation', inputs);
      const fp2 = AIGenerationCacheService.generateFingerprint('quiz-generation', inputs);

      expect(fp1.fingerprint).toBe(fp2.fingerprint);
    });

    it('should generate different fingerprint for different inputs', () => {
      const inputs1 = {
        content: 'Content 1',
        parameters: { difficulty: 'easy' },
        contractVersion: 1,
      };

      const inputs2 = {
        content: 'Content 2',
        parameters: { difficulty: 'hard' },
        contractVersion: 1,
      };

      const fp1 = AIGenerationCacheService.generateFingerprint('quiz-generation', inputs1);
      const fp2 = AIGenerationCacheService.generateFingerprint('quiz-generation', inputs2);

      expect(fp1.fingerprint).not.toBe(fp2.fingerprint);
    });

    it('should generate different fingerprint when version changes', () => {
      const baseInputs = {
        content: 'Same content',
        parameters: { difficulty: 'easy' },
        modelConfig: { temperature: 0.7 },
      };

      const fp1 = AIGenerationCacheService.generateFingerprint('quiz-generation', {
        ...baseInputs,
        contractVersion: 1,
      });

      const fp2 = AIGenerationCacheService.generateFingerprint('quiz-generation', {
        ...baseInputs,
        contractVersion: 2,
      });

      expect(fp1.fingerprint).not.toBe(fp2.fingerprint);
    });

    it('should normalize whitespace in content', () => {
      const inputs1 = {
        content: 'Test   content   with   spaces',
        contractVersion: 1,
      };

      const inputs2 = {
        content: 'test content with spaces', // normalized
        contractVersion: 1,
      };

      const fp1 = AIGenerationCacheService.generateFingerprint('quiz-generation', inputs1);
      const fp2 = AIGenerationCacheService.generateFingerprint('quiz-generation', inputs2);

      expect(fp1.fingerprint).toBe(fp2.fingerprint);
    });
  });

  describe('normalizeContent', () => {
    it('should normalize string content', () => {
      const input = '  Test  String  ';
      const normalized = AIGenerationCacheService.normalizeContent(input);

      expect(normalized).toBe('test string');
    });

    it('should normalize array content', () => {
      const input = ['  Test  ', '  Content  '];
      const normalized = AIGenerationCacheService.normalizeContent(input);

      expect(normalized).toEqual(['test', 'content']);
    });

    it('should normalize object content', () => {
      const input = { b: '  B  ', a: '  A  ' };
      const normalized = AIGenerationCacheService.normalizeContent(input);

      expect(Object.keys(normalized)[0]).toBe('a'); // Sorted alphabetically
    });
  });
});