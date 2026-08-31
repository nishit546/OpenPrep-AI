/**
 * @fileoverview Controller for handling reward store interactions and balance management.
 */
const rewardStoreService = require('../services/rewardStoreService');
// const UserReward = require('../models/UserReward');

/**
 * Fetches the reward catalog and user's current balance/inventory.
 */
const getStoreData = async (req, res) => {
    try {
        // const userId = req.user.id;

        // Mock user data
        const mockUserReward = {
            coinBalance: 420,
            inventory: { streakFreezes: 1, themes: [], aiBoosts: 0 },
            activeStreakFreeze: false
        };

        res.status(200).json({
            success: true,
            data: {
                catalog: rewardStoreService.REWARD_CATALOG,
                user: mockUserReward
            }
        });
    } catch (error) {
        console.error('Error fetching store data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Processes a reward purchase.
 */
const purchaseReward = async (req, res) => {
    try {
        const { itemId } = req.body;
        // const userId = req.user.id;

        if (!itemId) {
            return res.status(400).json({ success: false, message: 'itemId is required.' });
        }

        // Mock fetching user from DB
        const mockUserReward = {
            coinBalance: 420,
            inventory: { streakFreezes: 1, themes: [], aiBoosts: 0 },
            activeStreakFreeze: false,
            save: async function () { return this; } // Mock save
        };

        const result = await rewardStoreService.purchaseReward(mockUserReward, itemId);

        res.status(200).json({
            success: true,
            message: `Successfully purchased ${result.item.name}!`,
            data: {
                newBalance: result.newBalance,
                inventory: result.inventory
            }
        });
    } catch (error) {
        console.error('Error purchasing reward:', error);
        res.status(400).json({ success: false, message: error.message || 'Purchase failed.' });
    }
};

/**
 * Activates a streak freeze from the user's inventory.
 */
const activateStreakFreeze = async (req, res) => {
    try {
        // Mock fetching user from DB
        const mockUserReward = {
            inventory: { streakFreezes: 1, themes: [], aiBoosts: 0 },
            activeStreakFreeze: false,
            save: async function () { return this; }
        };

        const activated = await rewardStoreService.activateStreakFreeze(mockUserReward);

        if (activated) {
            res.status(200).json({
                success: true,
                message: 'Streak Freeze activated! Your next missed day will not break your streak.',
                data: {
                    streakFreezesRemaining: mockUserReward.inventory.streakFreezes,
                    activeStreakFreeze: mockUserReward.activeStreakFreeze
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'No Streak Freezes available in inventory.' });
        }
    } catch (error) {
        console.error('Error activating streak freeze:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getStoreData,
    purchaseReward,
    activateStreakFreeze,
};
