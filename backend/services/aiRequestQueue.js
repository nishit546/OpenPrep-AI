/**
 * @fileoverview Resilient priority requests queue for Gemini API with exponential backoff.
 */
const { Queue, Worker } = require('bullmq');
const redisService = require('./redisService');
const logger = require('../utils/logger');

const QUEUE_NAME = 'gemini-request-queue';

let aiQueue = null;
let aiWorker = null;

// Track queue latencies
const latencyMeasurements = [];

const initQueue = () => {
  if (aiQueue) return { queue: aiQueue, worker: aiWorker };

  const connection = redisService.connect();
  if (connection && typeof connection.on === 'function') {
    connection.on('error', () => {});
  }

  aiQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000, // starting backoff delay: 2s, 4s, 8s, 16s...
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // Worker processes requests based on priority (low priority numbers get processed first)
  aiWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const startTime = Date.now();
      const { prompt, apiCallFunction, options } = job.data;

      try {
        logger.info(`[AIQueue] Processing job ${job.id} (Priority: ${job.opts.priority || 'default'}).`);

        // Execute actual Gemini API request
        // In the worker, the function must be resolved or mocked for demonstration.
        // We can pass string function names and map them or execute them.
        let result;
        if (apiCallFunction === 'generateContent') {
          const { generateContentDirect } = require('./geminiService'); // existing helper
          result = await generateContentDirect(prompt, options);
        } else {
          // Default mock/fallback
          result = { response: { text: () => `Processed prompt: ${prompt}` } };
        }

        const latency = Date.now() - startTime;
        latencyMeasurements.push(latency);
        if (latencyMeasurements.length > 100) latencyMeasurements.shift(); // keep last 100

        return result;
      } catch (err) {
        // Intercept 429 and 503, add jitter to trigger resilient BullMQ backoff retry
        if (err.status === 429 || err.status === 503 || err.message.includes('429')) {
          const jitter = Math.random() * 1000;
          logger.warn(`[AIQueue] Upstream rate limit or overload error (status ${err.status}) on job ${job.id}. Retrying after delay with jitter...`);
          // Delay thread to backoff
          await new Promise((resolve) => setTimeout(resolve, jitter));
        }
        throw err; // throw so BullMQ registers failure and schedules backoff attempt
      }
    },
    {
      connection,
      concurrency: 2, // limit concurrent tasks to minimize 429 exhaustion
    }
  );

  aiWorker.on('failed', (job, err) => {
    logger.error(`[AIQueue] Job ${job.id} failed after maximum retry attempts: ${err.message}`);
  });

  return { queue: aiQueue, worker: aiWorker };
};

/**
 * Pushes a task to the queue.
 * @param {string} prompt - Prompt query string
 * @param {string} type - 'interactive' (Chat/Quiz) or 'background' (Summary/OCR)
 * @param {object} options - Generation parameters
 */
const addAiRequestToQueue = async (prompt, type = 'interactive', options = {}) => {
  const { queue } = initQueue();

  // Interactive real-time jobs get priority 1 (processed first), background tasks get priority 2
  const priority = type === 'interactive' ? 1 : 2;

  const job = await queue.add(
    'gemini-api-call',
    {
      prompt,
      apiCallFunction: options.apiCallFunction || 'generateContent',
      options,
      createdAt: Date.now(),
    },
    { priority }
  );

  return job;
};

const getAverageQueueLatency = () => {
  if (latencyMeasurements.length === 0) return 0;
  const sum = latencyMeasurements.reduce((a, b) => a + b, 0);
  return sum / latencyMeasurements.length;
};

module.exports = {
  initQueue,
  addAiRequestToQueue,
  getAverageQueueLatency,
  QUEUE_NAME,
};
