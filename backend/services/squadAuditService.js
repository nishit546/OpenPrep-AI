const { SquadAuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Creates a persistent squad audit log entry.
 */
async function logSquadEvent({ squadId, userId, action, ipAddress, metadata = {} }) {
  try {
    const log = await SquadAuditLog.create({
      squadId,
      userId,
      action,
      ipAddress: ipAddress || '127.0.0.1',
      metadata,
    });
    return log;
  } catch (err) {
    logger.error(`[SquadAuditService] Failed to create audit log entry: ${err.message}`);
    return null;
  }
}

module.exports = {
  logSquadEvent,
};
