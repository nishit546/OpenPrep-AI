const { expect, describe, it, beforeEach } = require('vitest');
const aiGatewayService = require('../../services/aiGatewayService');
const aiRequestQueue = require('../../services/aiRequestQueue');

describe('Gemini AI API Gateway & Rate Limiter', () => {
  beforeEach(() => {
    // Reset cache hits counters
    aiGatewayService.cacheHits = 0;
    aiGatewayService.cacheMisses = 0;
  });

  describe('Prompt Caching Gateway', () => {
    it('should write to cache and return cached response on identical queries', async () => {
      const prompt = 'What is the speed of light?';
      const mockResponse = { text: '299,792,458 m/s' };

      // Cache miss initially
      const cached1 = await aiGatewayService.getCachedPrompt(prompt);
      expect(cached1).to.be.null;
      expect(aiGatewayService.cacheMisses).to.equal(1);

      // Save to cache
      await aiGatewayService.setCachedPrompt(prompt, mockResponse);

      // Cache hit on second call
      const cached2 = await aiGatewayService.getCachedPrompt(prompt);
      expect(cached2).to.deep.equal(mockResponse);
      expect(aiGatewayService.cacheHits).to.equal(1);
    });
  });

  describe('Sliding Window Rate Limiter & Tiered Budgets', () => {
    it('should allow requests within budget and enforce daily limit caps', async () => {
      const userId = 'user_test_budget_123';
      
      // Free tier budget limit check (Free budget is 50k tokens/day)
      const check1 = await aiGatewayService.checkRateLimit(userId, 'FREE', 1000);
      expect(check1.allowed).to.be.true;

      // Exceed budget check
      const check2 = await aiGatewayService.checkRateLimit(userId, 'FREE', 60000);
      expect(check2.allowed).to.be.false;
      expect(check2.reason).to.contain('Daily token budget');
    });
  });

  describe('Priority Queue Requests', () => {
    it('should assign correct priorities to interactive vs background requests', async () => {
      const interactiveJob = await aiRequestQueue.addAiRequestToQueue('What is gravity?', 'interactive');
      expect(interactiveJob.opts.priority).to.equal(1);

      const backgroundJob = await aiRequestQueue.addAiRequestToQueue('Summarize notes', 'background');
      expect(backgroundJob.opts.priority).to.equal(2);
    });
  });
});
