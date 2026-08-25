const gamificationService = require('../services/gamificationService');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const User = require('../models/User');

/**
 * Resolves the caller's own calendar date as YYYY-MM-DD.
 *
 * Streak bookkeeping is per calendar day, so it has to be the user's day and
 * not the server's. Clients send either an IANA zone in `x-timezone` or a
 * legacy numeric minute offset in `x-timezone-offset`; an unusable value falls
 * back to UTC rather than throwing.
 */
function resolveLocalDate(req, now = new Date()) {
  const zone = req.headers?.['x-timezone'];

  if (zone) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      // Unknown zone name - fall through to the offset path.
    }
  }

  const offsetMinutes = Number(req.headers?.['x-timezone-offset']) || 0;
  return new Date(now.getTime() - offsetMinutes * 60 * 1000).toISOString().split('T')[0];
}

/**
 * @desc    Get current user gamification overview (XP, Level, Badges, Freezes)
 * @route   GET /api/gamification/status
 * @access  Private
 */
exports.getGamificationStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const levelInfo = gamificationService.getLevelInfo(user.xp || 0);
    const userBadges = await UserBadge.findAll({
      where: { userId: user.id },
      include: [{ model: Badge, as: 'badge' }],
    });

    return res.json({
      success: true,
      data: {
        ...levelInfo,
        streakCount: user.streakCount || 0,
        streakFreezes: user.streakFreezes || 0,
        badges: userBadges,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Purchase a streak freeze with XP
 * @route   POST /api/gamification/streak-freeze/buy
 * @access  Private
 */
exports.buyStreakFreeze = async (req, res) => {
  try {
    const result = await gamificationService.purchaseStreakFreeze(req.user.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Dashboard summary of the caller's gamification state
 * @route   GET /api/gamification/summary
 * @access  Private
 */
exports.getSummary = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userBadges = await UserBadge.findAll({
      where: { userId: user.id },
      include: [{ model: Badge, as: 'badge', where: { isActive: true }, required: false }],
      order: [['unlockedAt', 'DESC']],
    });

    const levelInfo = gamificationService.getLevelInfo(user.xp || 0);

    return res.status(200).json({
      success: true,
      data: {
        xp: user.xp || 0,
        level: levelInfo.level,
        nextLevelXP: levelInfo.currentXP + (levelInfo.levelXPRequired - levelInfo.levelXPProgress),
        progressPercent: levelInfo.progressPercent,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        streakFreezes: user.streakFreezes || 0,
        badges: userBadges.map((entry) => ({
          id: entry.id,
          badgeCode: entry.badgeCode,
          unlockedAt: entry.unlockedAt,
          title: entry.badge?.name || 'Achievement Unlocked',
          description: entry.badge?.description || 'Earned a study achievement badge.',
          svgIcon: entry.badge?.svgIcon || null,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Consume a streak freeze so today counts towards the streak
 * @route   POST /api/gamification/streak-freeze/use
 * @access  Private
 */
exports.useStreakFreeze = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if ((user.streakFreezes || 0) <= 0) {
      return res.status(400).json({ success: false, error: 'No streak freezes available' });
    }

    user.streakFreezes -= 1;
    // Mark today active in the caller's own timezone, otherwise a user east of
    // UTC burns a freeze on a day the server still considers yesterday.
    user.lastActivityDate = resolveLocalDate(req, new Date());
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Streak freeze consumed successfully.',
      data: {
        streakFreezes: user.streakFreezes,
        currentStreak: user.currentStreak || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};
