const redisService = require('./redisService');
const crypto = require('crypto');

const QUEUE_MAIN = 'queue:main';
const QUEUE_PROCESSING = 'queue:processing';
const QUEUE_DELAYED = 'queue:delayed';
const QUEUE_DLQ = 'queue:dlq';

// Registered job handlers
const jobHandlers = new Map();

/**
 * Register a job handler for a specific job name.
 */
function registerHandler(jobName, handler) {
  jobHandlers.set(jobName, handler);
}

/**
 * Enqueue a background task.
 */
async function enqueue(jobName, data, options = {}) {
  const job = {
    id: crypto.randomUUID(),
    name: jobName,
    data,
    retries: options.retries || 3,
    attempts: 0,
    backoffMs: options.backoffMs || 1000, // starting backoff delay
    timeoutMs: options.timeoutMs || 30000, // 30 seconds timeout default
    createdAt: Date.now()
  };

  if (redisService.isReady && redisService.client) {
    try {
      await redisService.client.lpush(QUEUE_MAIN, JSON.stringify(job));
      console.log(`[QueueService] Job ${job.id} (${jobName}) enqueued successfully.`);
      return job.id;
    } catch (err) {
      console.error('[QueueService] Failed to enqueue job to Redis:', err.message);
    }
  }

  // Local fallback: execute synchronously or asynchronously in memory if Redis is down
  console.warn(`[QueueService] Redis offline. Executing job ${job.id} (${jobName}) synchronously.`);
  const handler = jobHandlers.get(jobName);
  if (handler) {
    // Run in background so it doesn't block the caller
    setTimeout(async () => {
      try {
        await handler(data);
      } catch (err) {
        console.error(`[QueueService] Fallback execution failed for job ${jobName}:`, err.message);
      }
    }, 0);
  }
  return job.id;
}

/**
 * Get queue sizes and statistics.
 */
async function getQueueStats() {
  if (!redisService.isReady || !redisService.client) {
    return { status: 'Redis Offline', main: 0, processing: 0, delayed: 0, dlq: 0 };
  }

  try {
    const main = await redisService.client.llen(QUEUE_MAIN);
    const processing = await redisService.client.llen(QUEUE_PROCESSING);
    const delayed = await redisService.client.zcard(QUEUE_DELAYED);
    const dlq = await redisService.client.llen(QUEUE_DLQ);

    return {
      status: 'Active',
      main,
      processing,
      delayed,
      dlq
    };
  } catch (err) {
    console.error('[QueueService] Failed to fetch queue stats:', err.message);
    return { status: 'Error', error: err.message };
  }
}

/**
 * Retrieve recent DLQ jobs for auditing.
 */
async function getDlqJobs(limit = 20) {
  if (!redisService.isReady || !redisService.client) {
    return [];
  }
  try {
    const items = await redisService.client.lrange(QUEUE_DLQ, 0, limit - 1);
    return items.map(item => JSON.parse(item));
  } catch (err) {
    console.error('[QueueService] Failed to fetch DLQ jobs:', err.message);
    return [];
  }
}

module.exports = {
  enqueue,
  registerHandler,
  getQueueStats,
  getDlqJobs,
  jobHandlers,
};
