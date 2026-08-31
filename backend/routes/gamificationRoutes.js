/**
 * @fileoverview API routes for Gamification features.
 *
 * Every route here reads or mutates the calling user's own XP, streak and
 * badge state, so `protect` is applied to the whole router rather than to
 * individual routes - a route added below without auth would otherwise let an
 * anonymous caller grant themselves XP or spend another user's streak freezes.
 */
const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getGamificationStatus,
  getSummary,
  buyStreakFreeze,
  useStreakFreeze,
  getInventory,
  buyShopItem,
  openMysteryChest,
  equipAvatarFrame,
} = require('../controllers/gamificationController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/gamification/status
 * @desc    Level, XP progress, streak counters and unlocked badges
 * @access  Private
 */
router.get('/status', getGamificationStatus);

/**
 * @route   GET /api/gamification/summary
 * @desc    Dashboard summary - XP, level, streaks and badge list
 * @access  Private
 */
router.get('/summary', getSummary);

/**
 * @route   POST /api/gamification/streak-freeze/buy
 * @desc    Purchase a streak freeze with XP
 * @access  Private
 */
router.post('/streak-freeze/buy', buyStreakFreeze);

/**
 * @route   POST /api/gamification/streak-freeze/use
 * @desc    Consume a streak freeze to hold today's streak
 * @access  Private
 */
router.post('/streak-freeze/use', useStreakFreeze);

router.get('/inventory', getInventory);
router.post('/shop/buy', buyShopItem);
router.post('/chest/open', openMysteryChest);
router.post('/avatar/equip', equipAvatarFrame);

module.exports = router;
