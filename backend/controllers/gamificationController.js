const gamificationService = require('../services/gamificationService');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const User = require('../models/User');

const SHOP_PRICES = {
  streak_freeze: 150,
  xp_booster: 250,
  golden_sparkle_frame: 500,
  neon_blue_frame: 500,
};

/**
 * Resolves local date.
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
    } catch {}
  }
  const offsetMinutes = Number(req.headers?.['x-timezone-offset']) || 0;
  return new Date(now.getTime() - offsetMinutes * 60 * 1000).toISOString().split('T')[0];
}

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
        streakFreezes: user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0),
        badges: userBadges,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

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
        streakFreezes: user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0),
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

exports.useStreakFreeze = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const freezes = user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0);
    if (freezes <= 0) {
      return res.status(400).json({ success: false, error: 'No streak freezes available' });
    }

    if (user.streakFreezesAvailable !== undefined) {
      user.streakFreezesAvailable -= 1;
    }
    user.streakFreezes = Math.max(0, (user.streakFreezes || 0) - 1);
    user.lastActivityDate = resolveLocalDate(req, new Date());
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Streak freeze consumed successfully.',
      data: {
        streakFreezes: user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : user.streakFreezes,
        currentStreak: user.currentStreak || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.buyStreakFreeze = async (req, res) => {
  try {
    const result = await gamificationService.purchaseStreakFreeze(req.user.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/gamification/inventory
 */
exports.getInventory = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({
      success: true,
      data: {
        prepCoins: user.prepCoins || 0,
        streakFreezes: user.streakFreezesAvailable !== undefined ? user.streakFreezesAvailable : (user.streakFreezes || 0),
        activeXpBoosterUntil: user.activeXpBoosterUntil,
        ownedCosmetics: user.ownedCosmetics || [],
        equippedAvatarFrame: user.equippedAvatarFrame,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/gamification/shop/buy
 */
exports.buyShopItem = async (req, res) => {
  const { itemId } = req.body;
  const price = SHOP_PRICES[itemId];

  if (!price) {
    return res.status(400).json({ success: false, error: 'Invalid shop item requested' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if ((user.prepCoins || 0) < price) {
      return res.status(400).json({ success: false, error: 'Insufficient PrepCoins balance' });
    }

    user.prepCoins -= price;

    if (itemId === 'streak_freeze') {
      user.streakFreezes = (user.streakFreezes || 0) + 1;
      user.streakFreezesAvailable = (user.streakFreezesAvailable || 0) + 1;
    } else if (itemId === 'xp_booster') {
      const now = new Date();
      const currentExpiry = user.activeXpBoosterUntil && new Date(user.activeXpBoosterUntil) > now
        ? new Date(user.activeXpBoosterUntil)
        : now;
      user.activeXpBoosterUntil = new Date(currentExpiry.getTime() + 60 * 60 * 1000); // add 1 hour
    } else {
      // Cosmetic Avatar Frame
      const owned = user.ownedCosmetics || [];
      if (owned.includes(itemId)) {
        return res.status(400).json({ success: false, error: 'You already own this avatar frame' });
      }
      user.ownedCosmetics = [...owned, itemId];
    }

    await user.save();
    return res.json({
      success: true,
      message: `Purchased ${itemId} successfully`,
      data: {
        prepCoins: user.prepCoins,
        streakFreezes: user.streakFreezesAvailable,
        activeXpBoosterUntil: user.activeXpBoosterUntil,
        ownedCosmetics: user.ownedCosmetics,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/gamification/chest/open
 */
exports.openMysteryChest = async (req, res) => {
  const cost = 100;

  try {
    const user = await User.findByPk(req.user.id);
    if ((user.prepCoins || 0) < cost) {
      return res.status(400).json({ success: false, error: 'Insufficient PrepCoins. Chest unboxing costs 100 coins.' });
    }

    user.prepCoins -= cost;

    // Determine unboxing rewards
    // 90% chance: XP reward between 50 and 250 XP
    // 10% chance: Unlock rare avatar frame
    const roll = Math.random();
    let rewardType = 'xp';
    let rewardAmount = Math.floor(Math.random() * 201) + 50; // 50 to 250
    let cosmeticId = null;

    if (roll < 0.1) {
      rewardType = 'cosmetic';
      const cosmeticOptions = ['cosmic_glow_frame', 'ruby_shine_frame', 'emerald_matrix_frame'];
      cosmeticId = cosmeticOptions[Math.floor(Math.random() * cosmeticOptions.length)];
      
      const owned = user.ownedCosmetics || [];
      if (!owned.includes(cosmeticId)) {
        user.ownedCosmetics = [...owned, cosmeticId];
      }
    } else {
      await gamificationService.awardXP(user.id, rewardAmount, 'Mystery Chest reward');
    }

    await user.save();

    // Reload user to get latest XP updates
    const updatedUser = await User.findByPk(req.user.id);

    return res.json({
      success: true,
      rewardType,
      amount: rewardType === 'xp' ? rewardAmount : 0,
      cosmeticId,
      userCoins: updatedUser.prepCoins,
      xp: updatedUser.xp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/gamification/avatar/equip
 */
exports.equipAvatarFrame = async (req, res) => {
  const { cosmeticId } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (cosmeticId !== null) {
      const owned = user.ownedCosmetics || [];
      if (!owned.includes(cosmeticId)) {
        return res.status(400).json({ success: false, error: 'You do not own this avatar frame' });
      }
    }

    user.equippedAvatarFrame = cosmeticId;
    await user.save();

    return res.json({
      success: true,
      message: cosmeticId ? `Equipped ${cosmeticId} avatar frame` : 'Unequipped avatar frame',
      equippedAvatarFrame: user.equippedAvatarFrame,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
