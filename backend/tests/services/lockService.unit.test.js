const lockService = require('../../services/lockService');
const redisService = require('../../services/redisService');

describe('Distributed Lock Manager (Redlock)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    lockService.localLocks.clear();
    redisService.isReady = false;
    redisService.client = null;
  });

  describe('Local Fallback Locking (Redis Offline)', () => {
    it('should acquire and release lock successfully', async () => {
      const lockValue = await lockService.acquireLock('resource-1', 1000);
      expect(lockValue).toBeDefined();
      expect(lockService.localLocks.get('resource-1')).toBe(lockValue);

      const releaseResult = await lockService.releaseLock('resource-1', lockValue);
      expect(releaseResult).toBe(true);
      expect(lockService.localLocks.has('resource-1')).toBe(false);
    });

    it('should prevent acquiring lock if already held', async () => {
      const lock1 = await lockService.acquireLock('resource-1', 2000);
      const lock2 = await lockService.acquireLock('resource-1', 2000);

      expect(lock1).toBeDefined();
      expect(lock2).toBeNull();
    });

    it('should fail releasing lock if wrong value is provided', async () => {
      const lockValue = await lockService.acquireLock('resource-1', 2000);
      const releaseResult = await lockService.releaseLock('resource-1', 'wrong-uuid');

      expect(releaseResult).toBe(false);
      expect(lockService.localLocks.get('resource-1')).toBe(lockValue);
    });

    it('should automatically release lock after TTL timeout', async () => {
      const lockValue = await lockService.acquireLock('resource-timeout', 50);
      expect(lockService.localLocks.has('resource-timeout')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 80));

      expect(lockService.localLocks.has('resource-timeout')).toBe(false);
    });
  });

  describe('Redis Distributed Locking (Redis Online)', () => {
    it('should call Redis client set command with NX PX parameters', async () => {
      redisService.isReady = true;
      redisService.client = {
        set: vi.fn().mockResolvedValue('OK'),
        eval: vi.fn().mockResolvedValue(1),
      };

      const lockValue = await lockService.acquireLock('redis-resource', 30000);
      expect(lockValue).toBeDefined();
      expect(redisService.client.set).toHaveBeenCalledWith(
        'lock:redis-resource',
        lockValue,
        'NX',
        'PX',
        30000
      );

      const releaseResult = await lockService.releaseLock('redis-resource', lockValue);
      expect(releaseResult).toBe(true);
      expect(redisService.client.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'lock:redis-resource',
        lockValue
      );
    });

    it('should return null if Redis set returns null', async () => {
      redisService.isReady = true;
      redisService.client = {
        set: vi.fn().mockResolvedValue(null)
      };

      const lockValue = await lockService.acquireLock('redis-resource', 30000);
      expect(lockValue).toBeNull();
    });
  });
});
