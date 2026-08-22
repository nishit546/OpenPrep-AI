const redisService = require('../../services/redisService');
const queueService = require('../../services/queueService');
const { startWorker, stopWorker } = require('../../workers/taskQueueWorker');

describe('Event-Driven Task Orchestration Engine (Reliable Queue)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queueService.jobHandlers.clear();
    redisService.isReady = false;
    redisService.client = null;
  });

  afterEach(() => {
    stopWorker();
  });

  describe('QueueService core functions', () => {
    it('should fall back to synchronous direct invocation if Redis is offline', async () => {
      const handlerSpy = vi.fn().mockResolvedValue('success');
      queueService.registerHandler('test_sync_job', handlerSpy);

      const jobId = await queueService.enqueue('test_sync_job', { data: 'val' });

      expect(jobId).toBeDefined();
      // Give async tick a moment
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(handlerSpy).toHaveBeenCalledWith({ data: 'val' });
    });

    it('should push job JSON to Redis list if Redis is online', async () => {
      redisService.isReady = true;
      redisService.client = {
        lpush: vi.fn().mockResolvedValue(1),
      };

      const jobId = await queueService.enqueue('test_redis_job', { key: 'val' });

      expect(jobId).toBeDefined();
      expect(redisService.client.lpush).toHaveBeenCalledWith(
        'queue:main',
        expect.stringContaining('test_redis_job')
      );
    });
  });

  describe('TaskQueueWorker daemon', () => {
    it('should consume job, run handler, and acknowledge on success', async () => {
      redisService.isReady = true;

      const jobData = { id: 'job-123', name: 'sample_job', data: { x: 1 }, retries: 2, attempts: 0, timeoutMs: 1000 };
      
      redisService.client = {
        rpoplpush: vi.fn()
          .mockResolvedValueOnce(JSON.stringify(jobData))
          .mockResolvedValue(null),
        lrem: vi.fn().mockResolvedValue(1),
        zrangebyscore: vi.fn().mockResolvedValue([]),
      };

      const handlerSpy = vi.fn().mockResolvedValue('OK');
      queueService.registerHandler('sample_job', handlerSpy);

      await startWorker();

      // Give worker loop cycle a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handlerSpy).toHaveBeenCalledWith({ x: 1 });
      expect(redisService.client.lrem).toHaveBeenCalledWith('queue:processing', 1, expect.any(String));
    });

    it('should retry a failed task using exponential backoff and zadd', async () => {
      redisService.isReady = true;

      const jobData = { id: 'job-failing', name: 'failing_job', data: {}, retries: 3, attempts: 0, backoffMs: 10, timeoutMs: 100 };
      
      redisService.client = {
        rpoplpush: vi.fn()
          .mockResolvedValueOnce(JSON.stringify(jobData))
          .mockResolvedValue(null),
        lrem: vi.fn().mockResolvedValue(1),
        zadd: vi.fn().mockResolvedValue(1),
        zrangebyscore: vi.fn().mockResolvedValue([]),
      };

      const handlerSpy = vi.fn().mockRejectedValue(new Error('API Rate Limit'));
      queueService.registerHandler('failing_job', handlerSpy);

      await startWorker();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handlerSpy).toHaveBeenCalled();
      expect(redisService.client.zadd).toHaveBeenCalledWith('queue:delayed', expect.any(Number), expect.any(String));
      expect(redisService.client.lrem).toHaveBeenCalledWith('queue:processing', 1, expect.any(String));
    });

    it('should place a task in the DLQ when attempts exceed retries limit', async () => {
      redisService.isReady = true;

      // attempts = 2, retries = 2 -> will fail permanently
      const jobData = { id: 'job-dlq', name: 'dead_job', data: {}, retries: 2, attempts: 1, backoffMs: 10, timeoutMs: 100 };
      
      redisService.client = {
        rpoplpush: vi.fn()
          .mockResolvedValueOnce(JSON.stringify(jobData))
          .mockResolvedValue(null),
        lrem: vi.fn().mockResolvedValue(1),
        lpush: vi.fn().mockResolvedValue(1),
        zrangebyscore: vi.fn().mockResolvedValue([]),
      };

      const handlerSpy = vi.fn().mockRejectedValue(new Error('Fatal Error'));
      queueService.registerHandler('dead_job', handlerSpy);

      await startWorker();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(redisService.client.lpush).toHaveBeenCalledWith('queue:dlq', expect.stringContaining('Fatal Error'));
      expect(redisService.client.lrem).toHaveBeenCalledWith('queue:processing', 1, expect.any(String));
    });

    it('should fail task on execution timeout limit breach', async () => {
      redisService.isReady = true;

      const jobData = { id: 'job-timeout', name: 'slow_job', data: {}, retries: 1, attempts: 0, backoffMs: 10, timeoutMs: 50 };
      
      redisService.client = {
        rpoplpush: vi.fn()
          .mockResolvedValueOnce(JSON.stringify(jobData))
          .mockResolvedValue(null),
        lrem: vi.fn().mockResolvedValue(1),
        lpush: vi.fn().mockResolvedValue(1),
        zrangebyscore: vi.fn().mockResolvedValue([]),
      };

      // Handler runs longer than 50ms timeout config
      const handlerSpy = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
      queueService.registerHandler('slow_job', handlerSpy);

      await startWorker();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(redisService.client.lpush).toHaveBeenCalledWith('queue:dlq', expect.stringContaining('timed out'));
    });
  });
});
