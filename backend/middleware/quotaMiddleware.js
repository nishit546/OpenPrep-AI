const UsageQuota = require('../models/UsageQuota');

const checkQuota = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const [quota] = await UsageQuota.findOrCreate({
      where: { user: userId, date: today },
      defaults: { user: userId, date: today, count: 0, dailyCap: 50 },
    });

    if (quota.count >= quota.dailyCap) {
      return res.status(429).json({
        success: false,
        error: `Daily AI request limit reached (${quota.dailyCap}/day). Please try again tomorrow.`,
      });
    }

    quota.count += 1;
    await quota.save();

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkQuota };
