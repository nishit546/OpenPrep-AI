const redisService = require('../services/redisService');
const queueService = require('../services/queueService');

const QUEUE_MAIN = 'queue:main';
const QUEUE_PROCESSING = 'queue:processing';
const QUEUE_DELAYED = 'queue:delayed';
const QUEUE_DLQ = 'queue:dlq';

let running = false;
let timeoutId = null;
let sweepTimeoutId = null;

async function startWorker() {
  if (running) return;
  running = true;
  console.log('[TaskQueueWorker] Starting task queue worker...');
  runLoop();
  runSweepLoop();
}

function stopWorker() {
  running = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (sweepTimeoutId) {
    clearTimeout(sweepTimeoutId);
    sweepTimeoutId = null;
  }
  console.log('[TaskQueueWorker] Task queue worker stopped.');
}

async function runLoop() {
  if (!running) return;

  if (!redisService.isReady || !redisService.client) {
    timeoutId = setTimeout(runLoop, 5000);
    return;
  }

  let jobPayloadStr = null;
  try {
    // Atomically move a job from Main queue to Processing queue (Reliable queue pattern)
    jobPayloadStr = await redisService.client.rpoplpush(QUEUE_MAIN, QUEUE_PROCESSING);
  } catch (err) {
    console.error('[TaskQueueWorker] Redis RPOPLPUSH error:', err.message);
  }

  if (jobPayloadStr) {
    const job = JSON.parse(jobPayloadStr);
    const handler = queueService.jobHandlers.get(job.name);

    if (!handler) {
      console.warn(`[TaskQueueWorker] No handler registered for job: ${job.name}. Moving to DLQ.`);
      try {
        await redisService.client.lpush(QUEUE_DLQ, JSON.stringify({ ...job, failedAt: Date.now(), error: 'No handler registered' }));
        await redisService.client.lrem(QUEUE_PROCESSING, 1, jobPayloadStr);
      } catch (err) {
        console.error('[TaskQueueWorker] Failed to transition unhandled job:', err.message);
      }
    } else {
      // Execute the handler with timeout protection
      try {
        await executeWithTimeout(handler, job.data, job.timeoutMs);
        
        // Success! Remove from processing queue
        await redisService.client.lrem(QUEUE_PROCESSING, 1, jobPayloadStr);
        console.log(`[TaskQueueWorker] Job ${job.id} (${job.name}) completed successfully.`);
      } catch (err) {
        console.error(`[TaskQueueWorker] Job ${job.id} (${job.name}) failed:`, err.message);
        
        // Handle failures/retries
        try {
          await handleJobFailure(job, jobPayloadStr, err);
        } catch (failErr) {
          console.error('[TaskQueueWorker] Failed to process job failure transition:', failErr.message);
        }
      }
    }
  }

  // Schedule next check. If we got a job, run immediately; if empty, delay 500ms
  const delay = jobPayloadStr ? 0 : 500;
  timeoutId = setTimeout(runLoop, delay);
}

function executeWithTimeout(handler, data, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Job execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(handler(data))
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function handleJobFailure(job, jobPayloadStr, error) {
  job.attempts += 1;

  if (job.attempts < job.retries) {
    // Schedule retry with exponential backoff
    const delay = Math.pow(2, job.attempts) * job.backoffMs;
    const runTime = Date.now() + delay;

    console.log(`[TaskQueueWorker] Scheduling retry for job ${job.id} in ${delay}ms (Attempt ${job.attempts}/${job.retries})`);
    
    // Add to delayed set
    await redisService.client.zadd(QUEUE_DELAYED, runTime, JSON.stringify(job));
    // Remove from processing
    await redisService.client.lrem(QUEUE_PROCESSING, 1, jobPayloadStr);
  } else {
    // Permanent failure - move to DLQ
    console.error(`[TaskQueueWorker] Job ${job.id} failed permanently after ${job.retries} retries. Moving to DLQ.`);
    
    const dlqPayload = {
      ...job,
      failedAt: Date.now(),
      error: error.message
    };
    
    await redisService.client.lpush(QUEUE_DLQ, JSON.stringify(dlqPayload));
    await redisService.client.lrem(QUEUE_PROCESSING, 1, jobPayloadStr);
  }
}

/**
 * Sweep delayed jobs and push them to main queue when execution time arrives.
 */
async function runSweepLoop() {
  if (!running) return;

  if (redisService.isReady && redisService.client) {
    try {
      const now = Date.now();
      // Fetch all ready jobs
      const readyJobs = await redisService.client.zrangebyscore(QUEUE_DELAYED, 0, now);

      if (readyJobs && readyJobs.length > 0) {
        for (const jobStr of readyJobs) {
          // Push back to main queue
          await redisService.client.lpush(QUEUE_MAIN, jobStr);
          // Remove from delayed set
          await redisService.client.zrem(QUEUE_DELAYED, jobStr);
          
          const job = JSON.parse(jobStr);
          console.log(`[TaskQueueWorker] Delayed job ${job.id} (${job.name}) moved back to main queue for execution.`);
        }
      }
    } catch (err) {
      console.error('[TaskQueueWorker] Sweep loop error:', err.message);
    }
  }

  sweepTimeoutId = setTimeout(runSweepLoop, 1000); // sweep once a second
}

module.exports = {
  startWorker,
  stopWorker,
};
