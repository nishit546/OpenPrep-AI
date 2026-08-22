const redisService = require('./redisService');
const crypto = require('crypto');

// Local in-memory lock store
const localLocks = new Map();

/**
 * Acquire a local fallback lock.
 */
function acquireLocalLock(resourceName, lockValue, ttlMs) {
  if (localLocks.has(resourceName)) {
    return null; // lock is already held
  }
  
  // Set lock
  localLocks.set(resourceName, lockValue);
  
  // Auto release after TTL to prevent deadlocks
  setTimeout(() => {
    if (localLocks.get(resourceName) === lockValue) {
      localLocks.delete(resourceName);
    }
  }, ttlMs);
  
  return lockValue;
}

/**
 * Acquire a distributed lock.
 * @param {string} resourceName - Name of the resource to lock
 * @param {number} ttlMs - Lock time-to-live in milliseconds
 * @returns {Promise<string|null>} - Returns lockValue if successful, null if failed
 */
async function acquireLock(resourceName, ttlMs = 10000) {
  const lockKey = `lock:${resourceName}`;
  const lockValue = crypto.randomUUID();

  if (redisService.isReady && redisService.client) {
    try {
      const result = await redisService.client.set(lockKey, lockValue, 'NX', 'PX', ttlMs);
      if (result === 'OK') {
        return lockValue;
      }
      return null;
    } catch (err) {
      console.error(`[LockService] Failed to acquire lock for ${resourceName}:`, err.message);
    }
  }

  // Local fallback: If Redis is offline/unready, use in-memory map lock
  return acquireLocalLock(resourceName, lockValue, ttlMs);
}

/**
 * Release a distributed lock.
 * @param {string} resourceName - Name of the resource to lock
 * @param {string} lockValue - Lock value returned by acquireLock
 * @returns {Promise<boolean>} - Returns true if released successfully, false otherwise
 */
async function releaseLock(resourceName, lockValue) {
  if (!lockValue) return false;
  const lockKey = `lock:${resourceName}`;

  if (redisService.isReady && redisService.client) {
    try {
      // Classic atomic Lua script to release only if value matches
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
      `;
      const result = await redisService.client.eval(luaScript, 1, lockKey, lockValue);
      return result === 1;
    } catch (err) {
      console.error(`[LockService] Failed to release lock for ${resourceName}:`, err.message);
    }
  }

  // Local fallback
  if (localLocks.get(resourceName) === lockValue) {
    localLocks.delete(resourceName);
    return true;
  }
  return false;
}

module.exports = {
  acquireLock,
  releaseLock,
  localLocks,
};
