/**
 * @fileoverview Service for managing the virtual economy, purchases, and streak freeze logic.
 */

/**
 * Mock catalog of available rewards.
 */
const REWARD_CATALOG = [
    { id: 'streak_freeze', name: 'Streak Freeze', description: 'Protects your daily study streak for one missed day.', price: 150, category: 'Utility', icon: '🧊' },
    { id: 'theme_oled', name: 'Midnight OLED Theme', description: 'Unlock the pure black, battery-saving UI theme.', price: 300, category: 'Cosmetic', icon: '🌙' },
    { id: 'ai_boost', name: 'AI Prompt Boost', description: 'Get 5 premium, high-context AI generation credits.', price: 100, category: 'Utility', icon: '⚡' },
    { id: 'theme_sakura', name: 'Sakura Theme', description: 'Unlock the soft pink and white study theme.', price: 250, category: 'Cosmetic', icon: '🌸' },
];

/**
 * Processes a reward purchase, deducting coins and updating inventory.
 */
async function purchaseReward(userReward, itemId) {
    const item = REWARD_CATALOG.find(i => i.id === itemId);
    if (!item) {
        throw new Error('Invalid reward item.');
    }

    if (userReward.coinBalance < item.price) {
        throw new Error('Insufficient coin balance.');
    }

    // Deduct coins
    userReward.coinBalance -= item.price;

    // Update inventory based on item type
    const inventory = userReward.inventory;
    if (itemId === 'streak_freeze') {
        inventory.streakFreezes += 1;
        // Optionally auto-activate if they are in danger, but here we just add to stock
    } else if (itemId.startsWith('theme_')) {
        if (!inventory.themes.includes(itemId)) {
            inventory.themes.push(itemId);
        }
    } else if (itemId === 'ai_boost') {
        inventory.aiBoosts += 5;
    }

    userReward.inventory = inventory;
    await userReward.save();

    return { item, newBalance: userReward.coinBalance, inventory: userReward.inventory };
}

/**
 * Activates a streak freeze, preventing streak loss for the next missed day.
 */
async function activateStreakFreeze(userReward) {
    if (userReward.inventory.streakFreezes > 0) {
        userReward.inventory.streakFreezes -= 1;
        userReward.activeStreakFreeze = true;
        await userReward.save();
        return true;
    }
    return false;
}

module.exports = {
    REWARD_CATALOG,
    purchaseReward,
    activateStreakFreeze,
};
