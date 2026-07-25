const Redis = require('ioredis');

class RedisService {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  connect() {
    if (this.client) return this.client;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    // Lazy mode: don't crash if Redis is unavailable, just log it
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('Redis is unreachable. Falling back to DB only.');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      }
    });

    this.client.on('error', (err) => {
      console.warn('Redis Connection Error:', err.message);
      this.isReady = false;
    });

    this.client.on('ready', () => {
      console.log('Redis connected successfully');
      this.isReady = true;
    });

    return this.client;
  }

  async get(key) {
    if (!this.isReady) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Redis Get Error:', error.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isReady) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.warn('Redis Set Error:', error.message);
    }
  }

  async del(keyPattern) {
    if (!this.isReady) return;
    try {
      // In a clustered environment, KEYS is bad, but for a single instance it's okay for our scope.
      const keys = await this.client.keys(keyPattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.warn('Redis Del Error:', error.message);
    }
  }
}

module.exports = new RedisService();
