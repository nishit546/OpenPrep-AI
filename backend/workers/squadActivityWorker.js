const { SquadActivity, SquadMember } = require('../models');
const redisService = require('../services/redisService');
const crypto = require('crypto');

let running = false;
let timeoutId = null;
const consumerName = `squad_consumer_${crypto.randomBytes(4).toString('hex')}`;
const GROUP_NAME = 'squad_group';
const STREAM_NAME = 'squad:stream';

async function startWorker() {
  if (running) return;
  running = true;

  console.log(`[SquadActivityWorker] Starting worker consumer: ${consumerName}`);

  // Create group if not exists
  if (redisService.isReady && redisService.client) {
    try {
      await redisService.client.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '$', 'MKSTREAM');
    } catch (err) {
      if (!err.message.includes('BUSYGROUP')) {
        console.warn('[SquadActivityWorker] Failed to create XGROUP:', err.message);
      }
    }
  }

  runLoop();
}

function stopWorker() {
  running = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  console.log('[SquadActivityWorker] Worker stopped.');
}

async function runLoop() {
  if (!running) return;

  if (!redisService.isReady || !redisService.client) {
    // Retry in 5 seconds if Redis not ready
    timeoutId = setTimeout(runLoop, 5000);
    return;
  }

  try {
    // Read up to 50 events blocking for up to 2 seconds
    const response = await redisService.client.xreadgroup(
      'GROUP', GROUP_NAME, consumerName,
      'COUNT', '50',
      'BLOCK', '2000',
      'STREAMS', STREAM_NAME,
      '>'
    );

    if (response && response.length > 0) {
      const streamResults = response[0][1];
      const bulkRecords = [];
      const ackIds = [];
      const socketBroadcasts = [];

      for (const entry of streamResults) {
        const id = entry[0];
        const fields = entry[1];
        
        let dataStr = null;
        for (let i = 0; i < fields.length; i += 2) {
          if (fields[i] === 'data') {
            dataStr = fields[i + 1];
            break;
          }
        }

        if (!dataStr) {
          ackIds.push(id);
          continue;
        }

        const { userId, activityType, message, metadata } = JSON.parse(dataStr);
        const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

        // Fetch memberships for this user
        const memberships = await SquadMember.findAll({ where: { userId } });

        for (const member of memberships) {
          const activityId = crypto.randomUUID();
          const createdAt = new Date();

          bulkRecords.push({
            id: activityId,
            squadId: member.squadId,
            userId,
            activityType,
            message,
            metadata: parsedMetadata,
            createdAt,
            updatedAt: createdAt,
          });

          socketBroadcasts.push({
            squadId: member.squadId,
            payload: {
              id: activityId,
              squadId: member.squadId,
              userId,
              activityType,
              message,
              metadata: parsedMetadata,
              createdAt,
            }
          });
        }

        ackIds.push(id);
      }

      if (bulkRecords.length > 0) {
        // Batch write to PostgreSQL in bulk
        await SquadActivity.bulkCreate(bulkRecords);
        console.log(`[SquadActivityWorker] Bulk created ${bulkRecords.length} activity records.`);

        // Direct Socket.io push broadcasts
        if (global.io) {
          for (const item of socketBroadcasts) {
            global.io.to(`squad:${item.squadId}`).emit('squad:new_activity', item.payload);
          }
        }
      }

      // Acknowledge processed stream entries
      if (ackIds.length > 0) {
        await redisService.client.xack(STREAM_NAME, GROUP_NAME, ...ackIds);
      }
    }
  } catch (err) {
    console.error('[SquadActivityWorker] Error in execution loop:', err.message);
  }

  // Schedule next iteration immediately
  timeoutId = setTimeout(runLoop, 100);
}

module.exports = {
  startWorker,
  stopWorker,
  consumerName,
};
