const User = require('../models/User');

function calculateLevel(xp) {
  if (!xp || xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getNextLevelXP(level) {
  return Math.pow(level, 2) * 100;
}

async function addXP(userRecord, amount) {
  const userId = userRecord.id;
  const user = await User.findByPk(userId);
  if (!user) return { leveledUp: false };

  let xpAwarded = amount;
  if (user.activeXpBoosterUntil && new Date() < new Date(user.activeXpBoosterUntil)) {
    xpAwarded *= 2;
  }

  const previousLevel = user.level || 1;
  const currentXP = (user.xp || 0) + xpAwarded;
  user.xp = currentXP;

  const currentLevel = calculateLevel(currentXP);
  let leveledUp = false;
  if (currentLevel > previousLevel) {
    user.level = currentLevel;
    user.skillPoints = (user.skillPoints || 0) + (currentLevel - previousLevel);
    leveledUp = true;
  }

  await user.save();
  return {
    xp: user.xp,
    level: user.level,
    skillPoints: user.skillPoints,
    leveledUp,
    nextLevelXP: getNextLevelXP(user.level),
  };
}

module.exports = {
  calculateLevel,
  getNextLevelXP,
  addXP,
};
