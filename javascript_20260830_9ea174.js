/**
 * Habit Analytics Utility
 * Calculates consistency scores, trends, and analytics
 */

/**
 * Calculate 30-day rolling consistency score
 * @param {Array} logs - Array of habit logs
 * @param {number} windowDays - Number of days to consider (default: 30)
 * @returns {number} Consistency score (0-100)
 */
function calculateConsistencyScore(logs, windowDays = 30) {
  if (!logs || logs.length === 0) return 0;

  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  // Filter logs within the window
  const recentLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= cutoffDate && logDate <= today;
  });

  if (recentLogs.length === 0) return 0;

  // Calculate days in window with activity
  const uniqueDays = new Set(recentLogs.map(log => log.date));
  const activeDays = uniqueDays.size;

  // Calculate expected days (excluding future dates)
  const totalDays = windowDays;
  const consistency = (activeDays / totalDays) * 100;

  return Math.min(100, Math.round(consistency));
}

/**
 * Calculate quality-weighted analytics
 * @param {Array} logs - Array of habit logs with quality ratings
 * @returns {Object} Quality analytics
 */
function calculateQualityAnalytics(logs) {
  if (!logs || logs.length === 0) {
    return {
      averageQuality: 0,
      qualityDistribution: {},
      qualityTrend: [],
      totalLogs: 0,
    };
  }

  const qualityLogs = logs.filter(log => log.quality !== null && log.quality !== undefined);

  if (qualityLogs.length === 0) {
    return {
      averageQuality: 0,
      qualityDistribution: {},
      qualityTrend: [],
      totalLogs: 0,
    };
  }

  // Average quality
  const avgQuality = qualityLogs.reduce((sum, log) => sum + log.quality, 0) / qualityLogs.length;

  // Quality distribution
  const distribution = {};
  for (let i = 1; i <= 5; i++) {
    distribution[i] = qualityLogs.filter(log => log.quality === i).length;
  }

  // Quality trend (last 7 days)
  const qualityTrend = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = qualityLogs.filter(log => log.date === dateStr);
    const dayAvg = dayLogs.length > 0 
      ? dayLogs.reduce((sum, log) => sum + log.quality, 0) / dayLogs.length
      : 0;
    qualityTrend.push({
      date: dateStr,
      averageQuality: Math.round(dayAvg * 10) / 10,
      count: dayLogs.length,
    });
  }

  return {
    averageQuality: Math.round(avgQuality * 10) / 10,
    qualityDistribution: distribution,
    qualityTrend,
    totalLogs: qualityLogs.length,
  };
}

/**
 * Calculate mood-weighted analytics
 * @param {Array} logs - Array of habit logs with mood ratings
 * @returns {Object} Mood analytics
 */
function calculateMoodAnalytics(logs) {
  if (!logs || logs.length === 0) {
    return {
      averageMood: 0,
      moodDistribution: {},
      moodTrend: [],
      totalLogs: 0,
    };
  }

  const moodLogs = logs.filter(log => log.mood !== null && log.mood !== undefined);

  if (moodLogs.length === 0) {
    return {
      averageMood: 0,
      moodDistribution: {},
      moodTrend: [],
      totalLogs: 0,
    };
  }

  // Average mood
  const avgMood = moodLogs.reduce((sum, log) => sum + log.mood, 0) / moodLogs.length;

  // Mood distribution
  const distribution = {};
  for (let i = 1; i <= 5; i++) {
    distribution[i] = moodLogs.filter(log => log.mood === i).length;
  }

  // Mood trend (last 7 days)
  const moodTrend = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = moodLogs.filter(log => log.date === dateStr);
    const dayAvg = dayLogs.length > 0 
      ? dayLogs.reduce((sum, log) => sum + log.mood, 0) / dayLogs.length
      : 0;
    moodTrend.push({
      date: dateStr,
      averageMood: Math.round(dayAvg * 10) / 10,
      count: dayLogs.length,
    });
  }

  return {
    averageMood: Math.round(avgMood * 10) / 10,
    moodDistribution: distribution,
    moodTrend,
    totalLogs: moodLogs.length,
  };
}

/**
 * Calculate category-level analytics
 * @param {Array} habits - Array of habits with logs
 * @returns {Object} Category analytics
 */
function calculateCategoryAnalytics(habits) {
  if (!habits || habits.length === 0) {
    return {
      categories: {},
      totalHabits: 0,
      totalCompletions: 0,
    };
  }

  const categories = {};

  for (const habit of habits) {
    const category = habit.category || 'other';
    if (!categories[category]) {
      categories[category] = {
        habitCount: 0,
        totalCompletions: 0,
        averageConsistency: 0,
        totalDuration: 0,
        habits: [],
      };
    }

    categories[category].habitCount++;
    categories[category].totalCompletions += habit.totalCompletions || 0;
    categories[category].totalDuration += habit.totalDuration || 0;
    categories[category].habits.push({
      id: habit.id,
      name: habit.name,
      consistency: habit.consistencyScore || 0,
      streak: habit.currentStreak || 0,
      completions: habit.totalCompletions || 0,
    });
  }

  // Calculate averages
  for (const category of Object.keys(categories)) {
    const cat = categories[category];
    cat.averageConsistency = cat.habitCount > 0 
      ? cat.habits.reduce((sum, h) => sum + h.consistency, 0) / cat.habitCount
      : 0;
    cat.averageCompletions = cat.habitCount > 0
      ? cat.totalCompletions / cat.habitCount
      : 0;
  }

  return {
    categories,
    totalHabits: habits.length,
    totalCompletions: habits.reduce((sum, h) => sum + (h.totalCompletions || 0), 0),
  };
}

/**
 * Calculate weekly summary
 * @param {Array} logs - Array of habit logs
 * @param {Date} weekStart - Start of the week
 * @returns {Object} Weekly summary
 */
function calculateWeeklySummary(logs, weekStart) {
  if (!logs || logs.length === 0) {
    return {
      totalCompletions: 0,
      dailyBreakdown: [],
      categoryBreakdown: {},
      averageQuality: 0,
      averageMood: 0,
      totalDuration: 0,
    };
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Filter logs for this week
  const weekLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= weekStart && logDate <= weekEnd;
  });

  if (weekLogs.length === 0) {
    return {
      totalCompletions: 0,
      dailyBreakdown: [],
      categoryBreakdown: {},
      averageQuality: 0,
      averageMood: 0,
      totalDuration: 0,
    };
  }

  // Daily breakdown
  const dailyBreakdown = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = weekLogs.filter(log => log.date === dateStr);
    dailyBreakdown.push({
      day: days[i],
      date: dateStr,
      count: dayLogs.length,
      duration: dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0),
      quality: dayLogs.length > 0 
        ? dayLogs.reduce((sum, log) => sum + (log.quality || 0), 0) / dayLogs.length
        : 0,
    });
  }

  // Category breakdown
  const categoryBreakdown = {};
  for (const log of weekLogs) {
    const category = log.category || 'other';
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = {
        count: 0,
        duration: 0,
        quality: 0,
      };
    }
    categoryBreakdown[category].count++;
    categoryBreakdown[category].duration += log.duration || 0;
  }

  // Calculate averages
  for (const category of Object.keys(categoryBreakdown)) {
    const cat = categoryBreakdown[category];
    cat.averageQuality = cat.count > 0 
      ? weekLogs.filter(l => l.category === category).reduce((sum, l) => sum + (l.quality || 0), 0) / cat.count
      : 0;
  }

  return {
    totalCompletions: weekLogs.length,
    dailyBreakdown,
    categoryBreakdown,
    averageQuality: weekLogs.reduce((sum, log) => sum + (log.quality || 0), 0) / weekLogs.length || 0,
    averageMood: weekLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / weekLogs.length || 0,
    totalDuration: weekLogs.reduce((sum, log) => sum + (log.duration || 0), 0),
  };
}

/**
 * Generate streak-aware recommendations
 * @param {Array} habits - Array of habits
 * @param {Array} logs - Array of habit logs
 * @returns {Array} Recommendations
 */
function generateRecommendations(habits, logs) {
  const recommendations = [];

  if (!habits || habits.length === 0) {
    return recommendations;
  }

  // Find habits with low consistency
  const lowConsistency = habits
    .filter(h => h.consistencyScore < 30 && h.isActive)
    .sort((a, b) => a.consistencyScore - b.consistencyScore);

  for (const habit of lowConsistency.slice(0, 3)) {
    recommendations.push({
      type: 'low_consistency',
      habitId: habit.id,
      habitName: habit.name,
      message: `Try to be more consistent with "${habit.name}". Small daily steps build lasting habits.`,
      priority: 'high',
    });
  }

  // Find habits with great streaks to maintain
  const greatStreaks = habits
    .filter(h => h.currentStreak >= 7 && h.isActive)
    .sort((a, b) => b.currentStreak - a.currentStreak);

  for (const habit of greatStreaks.slice(0, 2)) {
    recommendations.push({
      type: 'streak_maintenance',
      habitId: habit.id,
      habitName: habit.name,
      message: `You have a ${habit.currentStreak}-day streak for "${habit.name}"! Keep it going! 🎉`,
      priority: 'medium',
    });
  }

  // Find habits with high quality but low consistency
  const qualityLogs = logs.filter(l => l.quality >= 4);
  const qualityHabits = new Set(qualityLogs.map(l => l.habitId));
  
  for (const habit of habits) {
    if (qualityHabits.has(habit.id) && habit.consistencyScore < 50 && habit.isActive) {
      recommendations.push({
        type: 'quality_consistency_gap',
        habitId: habit.id,
        habitName: habit.name,
        message: `You get great quality when you do "${habit.name}". Try to do it more often!`,
        priority: 'medium',
      });
    }
  }

  // Check for habits not done recently
  const recentLogs = logs.filter(l => {
    const date = new Date(l.date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return date >= sevenDaysAgo;
  });
  const recentHabits = new Set(recentLogs.map(l => l.habitId));

  for (const habit of habits) {
    if (!recentHabits.has(habit.id) && habit.isActive && habit.totalCompletions > 0) {
      recommendations.push({
        type: 'inactive_habit',
        habitId: habit.id,
        habitName: habit.name,
        message: `You haven't logged "${habit.name}" in the last week. Time to get back on track!`,
        priority: 'high',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

module.exports = {
  calculateConsistencyScore,
  calculateQualityAnalytics,
  calculateMoodAnalytics,
  calculateCategoryAnalytics,
  calculateWeeklySummary,
  generateRecommendations,
};