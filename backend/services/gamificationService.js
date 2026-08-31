const User = require('../models/User');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const xpRateLimiter = require('./xpRateLimiter');

class GamificationService {
  /**
   * Helper function matching SM-2 / Level tests
   */
  calculateLevel(xp) {
    if (!xp || xp <= 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  /**
   * Helper function matching level thresholds tests
   */
  getNextLevelXP(level) {
    return Math.pow(level, 2) * 100;
  }

  /**
   * Calculates current level and progress percentages
   */
  getLevelInfo(xp = 0) {
    const level = this.calculateLevel(xp);
    const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
    const nextLevelBaseXP = Math.pow(level, 2) * 100;
    const levelXPProgress = xp - currentLevelBaseXP;
    const levelXPRequired = nextLevelBaseXP - currentLevelBaseXP;
    const progressPercent = Math.min(100, Math.round((levelXPProgress / levelXPRequired) * 100));

    return {
      level,
      currentXP: xp,
      levelXPProgress,
      levelXPRequired,
      progressPercent,
    };
  }

  /**
   * Awards XP using the rate limiter and applying 2x XP boosts.
   */
  async awardXP(userId, amount, reason = '') {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    let baseAmount = amount;
    // Apply 2x XP Booster if active
    if (user.activeXpBoosterUntil && new Date() < new Date(user.activeXpBoosterUntil)) {
      baseAmount *= 2;
    }

    // Limit hourly XP to prevent exploits
    const rateLimit = await xpRateLimiter.consume(userId, baseAmount);
    const granted = rateLimit.granted;

    if (granted <= 0) {
      return {
        xp: user.xp,
        level: user.level || 1,
        message: 'Hourly XP limit reached',
      };
    }

    const previousLevel = user.level || 1;
    const currentXP = (user.xp || 0) + granted;
    user.xp = currentXP;

    const currentLevel = this.calculateLevel(currentXP);
    let leveledUp = false;
    if (currentLevel > previousLevel) {
      user.level = currentLevel;
      user.skillPoints = (user.skillPoints || 0) + (currentLevel - previousLevel);
      leveledUp = true;
    }

    await user.save();

    return {
      success: true,
      xp: user.xp,
      level: user.level,
      skillPoints: user.skillPoints,
      leveledUp,
      nextLevelXP: this.getNextLevelXP(user.level),
      message: `Awarded ${granted} XP`,
    };
  }

  /**
   * Legacy method for backward compat with addXP
   */
  async addXP(userId, amount) {
    const res = await this.awardXP(userId, amount);
    return this.getLevelInfo(res.xp);
  }

  /**
   * Generates PrepCoins for actions
   */
  async awardCoins(userId, amount, reason = '') {
    const user = await User.findByPk(userId);
    if (!user) return 0;

    user.prepCoins = (user.prepCoins || 0) + amount;
    await user.save();
    return user.prepCoins;
  }

  /**
   * Evaluates criteria and awards eligible achievement badges
   */
  async checkAndAwardBadges(userId, actionType, metricValue) {
    const badges = await Badge.findAll({ where: { criteriaType: actionType } });
    const userBadges = await UserBadge.findAll({ where: { userId } });
    const userBadgeIds = userBadges.map((ub) => ub.badgeId);

    const newlyUnlocked = [];

    for (const badge of badges) {
      if (!userBadgeIds.includes(badge.id) && metricValue >= badge.criteriaThreshold) {
        await UserBadge.create({ userId, badgeId: badge.id });
        await this.awardXP(userId, badge.pointsValue || 100);
        newlyUnlocked.push(badge);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Timezone-aware streak updates with auto freeze check
   */
  async updateStreak(userId, timezoneOffset = 0) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    let localDateString;
    
    if (typeof timezoneOffset === 'number') {
      const localTime = new Date(now.getTime() - timezoneOffset * 60 * 1000);
      localDateString = localTime.toISOString().split('T')[0];
    } else {
      // String timezone like 'Asia/Kolkata'
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezoneOffset || 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      localDateString = formatter.format(now);
    }

    const lastActive = user.lastActivityDate;
    if (!lastActive) {
      user.currentStreak = 1;
      user.streakCount = 1;
      user.lastActivityDate = localDateString;
      await user.save();
      return user;
    }

    if (lastActive === localDateString) {
      return user;
    }

    const dateA = new Date(`${lastActive}T00:00:00Z`);
    const dateB = new Date(`${localDateString}T00:00:00Z`);
    const diffTime = Math.abs(dateB - dateA);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.currentStreak = (user.currentStreak || user.streakCount || 0) + 1;
      user.streakCount = user.currentStreak;
    } else if (diffDays === 2) {
      const freezes = user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0);
      if (freezes > 0) {
        if (user.streakFreezesAvailable !== undefined) {
          user.streakFreezesAvailable -= 1;
        }
        user.streakFreezes = Math.max(0, (user.streakFreezes || 0) - 1);
        
        user.currentStreak = (user.currentStreak || user.streakCount || 0) + 1;
        user.streakCount = user.currentStreak;
      } else {
        user.currentStreak = 1;
        user.streakCount = 1;
      }
    } else {
      user.currentStreak = 1;
      user.streakCount = 1;
    }

    user.lastActivityDate = localDateString;
    if (user.currentStreak > (user.longestStreak || 0)) {
      user.longestStreak = user.currentStreak;
    }

    await user.save();
    return user;
  }

  /**
   * Streak Milestones unlock evaluation
   */
  async checkAndUnlockBadges(user, actionType, details = {}) {
    const newlyUnlocked = [];
    const currentStreak = user.currentStreak || user.streakCount || 0;

    if (currentStreak >= 30) {
      const existing = await UserBadge.findOne({
        where: { userId: user.id, badgeId: 'badge-30' },
      });
      if (!existing) {
        await UserBadge.create({
          userId: user.id,
          badgeId: 'badge-30',
          badgeCode: 'thirty_day_streak',
        });
        
        user.streakFreezesAvailable = (user.streakFreezesAvailable || 0) + 1;
        user.streakFreezes = (user.streakFreezes || 0) + 1;
        await user.save();

        newlyUnlocked.push({ id: 'badge-30', badgeCode: 'thirty_day_streak' });
      }
    }

    if (currentStreak >= 100) {
      const existing = await UserBadge.findOne({
        where: { userId: user.id, badgeId: 'badge-100' },
      });
      if (!existing) {
        await UserBadge.create({
          userId: user.id,
          badgeId: 'badge-100',
          badgeCode: 'hundred_day_streak',
        });
        newlyUnlocked.push({ id: 'badge-100', badgeCode: 'hundred_day_streak' });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Consumes streak freezes
   */
  async useStreakFreeze(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    const freezes = user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0);
    if (freezes <= 0) {
      throw new Error('No streak freezes available in inventory');
    }

    if (user.streakFreezesAvailable !== undefined) {
      user.streakFreezesAvailable -= 1;
    }
    user.streakFreezes = Math.max(0, (user.streakFreezes || 0) - 1);
    await user.save();

    return { 
      success: true, 
      remainingFreezes: user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : user.streakFreezes 
    };
  }

  /**
   * Legacy method purchase with XP
   */
  async purchaseStreakFreeze(userId, costInXP = 300) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    if ((user.xp || 0) < costInXP) {
      throw new Error(`Insufficient XP. Required: ${costInXP}, Available: ${user.xp || 0}`);
    }

    user.xp -= costInXP;
    user.streakFreezes = (user.streakFreezes || 0) + 1;
    user.streakFreezesAvailable = (user.streakFreezesAvailable || 0) + 1;
    await user.save();

    return {
      success: true,
      streakFreezes: user.streakFreezesAvailable,
      remainingXP: user.xp,
    };
  }

  /**
   * Automated Cron: auto consumes streak freezes daily for inactive users.
   */
  async maintainDailyStreaks() {
    const users = await User.findAll();
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const user of users) {
      const lastActive = user.lastActivityDate;
      if (!lastActive) continue;

      if (lastActive !== todayStr && lastActive !== yesterdayStr) {
        // Missed study session
        const freezes = user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0);
        if (freezes > 0) {
          if (user.streakFreezesAvailable !== undefined) {
            user.streakFreezesAvailable -= 1;
          }
          user.streakFreezes = Math.max(0, (user.streakFreezes || 0) - 1);
          user.lastActivityDate = yesterdayStr; // preserve streak count
        } else {
          // Reset streak to zero
          user.currentStreak = 0;
          user.streakCount = 0;
        }
        await user.save();
      }
    }
  }
}

module.exports = new GamificationService();
