/**
 * @fileoverview API routes for Gamified Reward Store and Streak Management.
 */
const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');

/**
 * @route   GET /api/rewards/store
 * @desc    Fetch reward catalog and user's current balance/inventory
 * @access  Private
 */
router.get('/store', rewardController.getStoreData);

/**
 * @route   POST /api/rewards/purchase
 * @desc    Purchase a reward using Study Coins
 * @access  Private
 */
router.post('/purchase', rewardController.purchaseReward);

/**
 * @route   POST /api/rewards/activate-streak-freeze
 * @desc    Activate a streak freeze from inventory to protect daily streak
 * @access  Private
 */
router.post('/activate-streak-freeze', rewardController.activateStreakFreeze);

module.exports = router;
