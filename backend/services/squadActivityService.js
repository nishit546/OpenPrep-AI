const {
  SquadActivity,
  SquadActivityReaction,
  SquadMember,
  User,
} = require('../models');
const redisService = require('./redisService');

/**
 * Emojis a member may react with. Anything else is rejected rather than stored,
 * so the reaction tally can never grow keys the feed UI has no icon for.
 */
const SUPPORTED_EMOJIS = ['🔥', '👏', '🎉', '💪', '❤️'];

/** Default collaborators, overridable per-call so unit tests can inject doubles. */
const defaultDeps = {
  squadActivityModel: SquadActivity,
  reactionModel: SquadActivityReaction,
  squadMemberModel: SquadMember,
  userModel: User,
};

const resolve = (deps = {}) => ({ ...defaultDeps, ...deps });

/**
 * Recompute the reaction tally for one activity from the reaction rows.
 *
 * Derived rather than incremented: a toggle that races with another member's
 * toggle would otherwise drift away from the rows it is supposed to summarise,
 * and there is no cheap way to notice once it has.
 */
async function recalculateReactionCounts(activity, reactionModel) {
  const reactions = await reactionModel.findAll({
    where: { activityId: activity.id },
    attributes: ['emoji'],
  });

  const counts = reactions.reduce((acc, row) => {
    acc[row.emoji] = (acc[row.emoji] || 0) + 1;
    return acc;
  }, {});

  activity.reactionCounts = counts;
  await activity.save();

  return counts;
}

/**
 * Post a milestone to every squad feed the user belongs to.
 *
 * Callers are quiz submission, streak updates and badge unlocks — operations
 * the user actually asked for. A social side effect must never fail those, so
 * every failure here is logged and swallowed rather than propagated. The
 * return value reports what happened for callers that care.
 *
 * @param {string} userId
 * @param {'quiz_completed'|'streak_hit'|'badge_unlocked'} type
 * @param {string} message Human-readable milestone text shown in the feed.
 * @param {object} [metadata] Structured detail for the feed UI.
 * @param {object} [deps] Injected models (tests only).
 */
async function logSquadActivity(userId, type, message, metadata = {}, deps = {}) {
  const { squadActivityModel, squadMemberModel } = resolve(deps);

  if (!userId || !type || !message) {
    return { posted: 0, skipped: true };
  }

  try {
    const memberships = await squadMemberModel.findAll({ where: { userId } });
    if (memberships.length === 0) {
      return { posted: 0, skipped: false };
    }

    // Try storing to Redis Stream CDC first
    if (redisService.isReady && redisService.client) {
      try {
        const eventData = {
          userId,
          activityType: type,
          message,
          metadata: JSON.stringify(metadata)
        };
        await redisService.client.xadd('squad:stream', '*', 'data', JSON.stringify(eventData));
        return { posted: memberships.length, skipped: false, queued: true };
      } catch (redisErr) {
        console.warn('[squadActivityService] Redis Stream push failed. Falling back to DB write.', redisErr.message);
      }
    }

    // Local Fallback: Synchronous Database Write
    let posted = 0;

    for (const member of memberships) {
      // `message` is NOT NULL on the model — passing the text through under any
      // other key drops it and fails the insert.
      const activity = await squadActivityModel.create({
        squadId: member.squadId,
        userId,
        activityType: type,
        message,
        metadata,
      });
      posted += 1;

      if (global.io) {
        global.io.to(`squad:${member.squadId}`).emit('squad:new_activity', {
          id: activity.id,
          squadId: member.squadId,
          userId,
          activityType: type,
          message,
          metadata,
          createdAt: activity.createdAt,
        });
      }
    }

    return { posted, skipped: false };
  } catch (error) {
    console.error('Failed to post squad activity:', error.message);
    return { posted: 0, skipped: false, error: error.message };
  }
}

/**
 * Read one squad's feed, newest first.
 *
 * Ordered by `createdAt` — the column `timestamps: true` actually creates. The
 * caller is responsible for checking squad membership before calling.
 */
async function getActivityFeed(squadId, requestingUserId, limit = 50, offset = 0, deps = {}) {
  const { squadActivityModel, reactionModel, userModel } = resolve(deps);

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const activities = await squadActivityModel.findAll({
    where: { squadId },
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    offset: safeOffset,
    include: [
      {
        model: userModel,
        as: 'userRef',
        attributes: ['id', 'name', 'avatar'],
      },
      {
        model: reactionModel,
        as: 'SquadActivityReactions',
        include: [{ model: userModel, as: 'userRef', attributes: ['id', 'name'] }],
      },
    ],
  });

  // Flag the requester's own reactions so the client can render them as active
  // without a second round trip.
  return activities.map((activity) => {
    const plain = typeof activity.toJSON === 'function' ? activity.toJSON() : activity;
    const reactions = plain.SquadActivityReactions || [];

    return {
      ...plain,
      myReactions: reactions
        .filter((r) => String(r.userId) === String(requestingUserId))
        .map((r) => r.emoji),
    };
  });
}

/**
 * Toggle one member's reaction on one activity.
 *
 * `squadId` comes from the route and is checked against the activity's own
 * squad: membership of the squad in the URL is not membership of the squad the
 * activity belongs to, and without this check any member could react to a feed
 * they cannot read.
 */
async function reactToActivity(activityId, userId, emoji, squadId = null, deps = {}) {
  const { squadActivityModel, reactionModel } = resolve(deps);

  if (!SUPPORTED_EMOJIS.includes(emoji)) {
    throw new Error('Unsupported reaction emoji');
  }

  const activity = await squadActivityModel.findByPk(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  if (squadId && String(activity.squadId) !== String(squadId)) {
    throw new Error('Activity does not belong to this squad');
  }

  const [reaction, created] = await reactionModel.findOrCreate({
    where: { activityId, userId, emoji },
  });

  if (!created) {
    await reaction.destroy();
  }

  const reactionCounts = await recalculateReactionCounts(activity, reactionModel);
  const action = created ? 'added' : 'removed';

  if (global.io) {
    global.io.to(`squad:${activity.squadId}`).emit('squad:reaction_updated', {
      squadId: activity.squadId,
      activityId,
      reactionCounts,
    });
  }

  return { action, emoji, reactionCounts };
}

module.exports = {
  logSquadActivity,
  getActivityFeed,
  reactToActivity,
  SUPPORTED_EMOJIS,
};
