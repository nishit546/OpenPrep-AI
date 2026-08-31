const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/db');
const StudyHeatmap = require('../models/StudyHeatmap');

// ── Constants ────────────────────────────────────────────────────────────

/** Maximum minutes that constitutes a "full" study day for intensity scoring. */
const FULL_DAY_MINUTES = 480; // 8 hours

/** Colour thresholds for heatmap intensity buckets (0-4 scale, GitHub-style). */
const INTENSITY_THRESHOLDS = [0, 15, 60, 120, 240];

// ── Record Study Activity ────────────────────────────────────────────────

/**
 * Record or merge study activity for a given date.
 * If a record already exists for the user + date the data is merged additively.
 *
 * @param {string} userId
 * @param {object} activity
 * @param {number} activity.durationMinutes – length of the session
 * @param {string} [activity.subjectId]
 * @param {string} [activity.subjectName]
 * @param {number} [activity.hour] – hour of day (0-23) when study happened
 * @param {string} [activity.quizId]
 * @param {number} [activity.quizScore]
 * @param {number} [activity.quizTotal]
 * @param {number} [activity.flashcardsReviewed]
 * @returns {Promise<StudyHeatmap>}
 */
async function recordActivity(userId, activity) {
  const today = activity.date || new Date().toISOString().split('T')[0];
  const hour = activity.hour != null ? activity.hour : new Date().getHours();

  const [record, created] = await StudyHeatmap.findOrCreate({
    where: { user: userId, date: today },
    defaults: {
      user: userId,
      date: today,
      totalMinutes: 0,
      sessionCount: 0,
      hourlyBreakdown: {},
      subjectsStudied: [],
      quizScores: [],
      flashcardsReviewed: 0,
      peakHour: null,
      intensityScore: 0,
    },
  });

  // Merge hourly breakdown
  const hourly = { ...record.hourlyBreakdown };
  const currentMinutes = parseInt(hourly[hour], 10) || 0;
  hourly[hour] = currentMinutes + (activity.durationMinutes || 0);

  // Merge subjects studied
  const subjects = [...(record.subjectsStudied || [])];
  if (activity.subjectId && activity.subjectName) {
    const existing = subjects.find((s) => s.subjectId === activity.subjectId);
    if (existing) {
      existing.minutes += activity.durationMinutes || 0;
    } else {
      subjects.push({
        subjectId: activity.subjectId,
        subjectName: activity.subjectName,
        minutes: activity.durationMinutes || 0,
      });
    }
  }

  // Merge quiz scores
  const quizzes = [...(record.quizScores || [])];
  if (activity.quizId) {
    quizzes.push({
      quizId: activity.quizId,
      score: activity.quizScore || 0,
      totalQuestions: activity.quizTotal || 0,
    });
  }

  // Compute peak hour
  let peakHour = record.peakHour;
  let maxMinutes = 0;
  for (const [h, m] of Object.entries(hourly)) {
    if (parseInt(m, 10) > maxMinutes) {
      maxMinutes = parseInt(m, 10);
      peakHour = parseInt(h, 10);
    }
  }

  const totalMinutes = record.totalMinutes + (activity.durationMinutes || 0);

  record.set({
    totalMinutes,
    sessionCount: record.sessionCount + 1,
    hourlyBreakdown: hourly,
    subjectsStudied: subjects,
    quizScores: quizzes,
    flashcardsReviewed: record.flashcardsReviewed + (activity.flashcardsReviewed || 0),
    peakHour,
    intensityScore: computeIntensityScore(totalMinutes),
  });

  await record.save();
  return record;
}

// ── Heatmap Grid ─────────────────────────────────────────────────────────

/**
 * Generate a heatmap grid for a calendar month.
 * Returns a 2D array suitable for rendering a contribution-style heatmap.
 *
 * @param {string} userId
 * @param {number} year
 * @param {number} month – 1-indexed
 * @returns {Promise<object>}
 */
async function getMonthlyHeatmap(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const records = await StudyHeatmap.findAll({
    where: {
      user: userId,
      date: { [Op.gte]: startDate, [Op.lt]: endDate },
    },
    order: [['date', 'ASC']],
  });

  // Build lookup by date
  const byDate = {};
  for (const r of records) {
    byDate[r.date] = {
      totalMinutes: r.totalMinutes,
      intensityScore: r.intensityScore,
      intensityLevel: getIntensityLevel(r.totalMinutes),
      sessionCount: r.sessionCount,
    };
  }

  // Generate all days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const grid = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = byDate[dateStr] || { totalMinutes: 0, intensityScore: 0, intensityLevel: 0, sessionCount: 0 };
    grid.push({ date: dateStr, dayOfWeek: new Date(dateStr).getUTCDay(), ...entry });
  }

  // Monthly summary
  const totalMinutes = records.reduce((sum, r) => sum + r.totalMinutes, 0);
  const activeDays = records.filter((r) => r.totalMinutes > 0).length;
  const totalSessions = records.reduce((sum, r) => sum + r.sessionCount, 0);

  return {
    year,
    month,
    grid,
    summary: {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      activeDays,
      totalSessions,
      averageMinutesPerDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
      longestStreak: computeLongestStreak(records),
    },
  };
}

/**
 * Generate a year-long heatmap (aggregated to weeks).
 * Returns weekly intensity data for a full-year contribution chart.
 */
async function getYearlyHeatmap(userId, year) {
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  const records = await StudyHeatmap.findAll({
    where: {
      user: userId,
      date: { [Op.gte]: startDate, [Op.lt]: endDate },
    },
    order: [['date', 'ASC']],
  });

  // Aggregate to daily intensity
  const byDate = {};
  for (const r of records) {
    byDate[r.date] = {
      totalMinutes: r.totalMinutes,
      intensityLevel: getIntensityLevel(r.totalMinutes),
    };
  }

  // Build full year grid (fill missing days with zeros)
  const grid = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const entry = byDate[dateStr] || { totalMinutes: 0, intensityLevel: 0 };
    grid.push({ date: dateStr, ...entry });
  }

  const totalMinutes = records.reduce((sum, r) => sum + r.totalMinutes, 0);
  const activeDays = records.filter((r) => r.totalMinutes > 0).length;

  return {
    year,
    grid,
    summary: {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      activeDays,
      totalDaysInYear: grid.length,
      activityRate: Math.round((activeDays / grid.length) * 100),
      longestStreak: computeLongestStreak(records),
    },
  };
}

// ── Peak Hours Analysis ──────────────────────────────────────────────────

/**
 * Analyse peak study hours across a date range.
 * Returns hourly averages, best hours, and a recommended study schedule.
 */
async function getPeakHoursAnalysis(userId, { startDate, endDate } = {}) {
  const where = { user: userId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date[Op.gte] = startDate;
    if (endDate) where.date[Op.lte] = endDate;
  }

  const records = await StudyHeatmap.findAll({ where });

  // Aggregate hourly totals across all days
  const hourlyTotals = new Array(24).fill(0);
  const hourlyDays = new Array(24).fill(0);

  for (const record of records) {
    const hourly = record.hourlyBreakdown || {};
    for (let h = 0; h < 24; h++) {
      const minutes = parseInt(hourly[h], 10) || 0;
      if (minutes > 0) {
        hourlyTotals[h] += minutes;
        hourlyDays[h] += 1;
      }
    }
  }

  // Compute averages
  const hourlyAverage = hourlyTotals.map((total, h) => ({
    hour: h,
    label: formatHour(h),
    totalMinutes: total,
    daysActive: hourlyDays[h],
    avgMinutes: hourlyDays[h] > 0 ? Math.round(total / hourlyDays[h]) : 0,
  }));

  // Sort by average to find peak hours
  const sorted = [...hourlyAverage].sort((a, b) => b.avgMinutes - a.avgMinutes);
  const peakHours = sorted.slice(0, 5).filter((h) => h.avgMinutes > 0);
  const quietHours = sorted.slice(-5).reverse().filter((h) => h.avgMinutes > 0);

  // Generate recommended schedule (3-hour blocks around peak hours)
  const recommendedSchedule = generateRecommendedSchedule(hourlyAverage);

  return {
    hourlyBreakdown: hourlyAverage,
    peakHours,
    quietHours,
    recommendedSchedule,
    totalDaysAnalyzed: records.length,
  };
}

// ── Streak Analytics ─────────────────────────────────────────────────────

/**
 * Get detailed streak analytics for a user.
 */
async function getStreakAnalytics(userId) {
  const records = await StudyHeatmap.findAll({
    where: { user: userId, totalMinutes: { [Op.gt]: 0 } },
    order: [['date', 'ASC']],
  });

  if (records.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      averageMinutesPerActiveDay: 0,
      streakHistory: [],
    };
  }

  const dates = records.map((r) => r.date);
  const currentStreak = computeCurrentStreak(dates);
  const longestStreak = computeLongestStreak(records);

  // Build streak history (contiguous blocks)
  const streakHistory = computeStreakHistory(dates);

  const totalActiveDays = dates.length;
  const totalMinutes = records.reduce((sum, r) => sum + r.totalMinutes, 0);

  return {
    currentStreak,
    longestStreak,
    totalActiveDays,
    totalMinutesStudied: totalMinutes,
    averageMinutesPerActiveDay: Math.round(totalMinutes / totalActiveDays),
    streakHistory,
    longestStreakPeriod: streakHistory.reduce(
      (max, s) => (s.length > max.length ? s : max),
      { length: 0, startDate: null, endDate: null },
    ),
  };
}

// ── Dashboard ────────────────────────────────────────────────────────────

/**
 * Get a consolidated heatmap dashboard.
 */
async function getDashboard(userId) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [monthlyHeatmap, streakAnalytics, peakHours] = await Promise.all([
    getMonthlyHeatmap(userId, currentYear, currentMonth),
    getStreakAnalytics(userId),
    getPeakHoursAnalysis(userId, {
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    }),
  ]);

  return {
    currentMonth: monthlyHeatmap,
    streaks: streakAnalytics,
    peakHours,
    todayMinutes: await getTodayMinutes(userId),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function getTodayMinutes(userId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await StudyHeatmap.findOne({
    where: { user: userId, date: today },
  });
  return record ? record.totalMinutes : 0;
}

function computeIntensityScore(totalMinutes) {
  return Math.min(100, Math.round((totalMinutes / FULL_DAY_MINUTES) * 100));
}

function getIntensityLevel(totalMinutes) {
  for (let i = INTENSITY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalMinutes >= INTENSITY_THRESHOLDS[i]) return i;
  }
  return 0;
}

function computeCurrentStreak(dates) {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(records) {
  const dates = records.filter((r) => r.totalMinutes > 0).map((r) => r.date);
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function computeStreakHistory(dates) {
  const sorted = [...dates].sort();
  if (sorted.length === 0) return [];

  const streaks = [];
  let streakStart = sorted[0];
  let streakEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      streakEnd = sorted[i];
    } else {
      streaks.push({
        startDate: streakStart,
        endDate: streakEnd,
        length: Math.round((new Date(streakEnd) - new Date(streakStart)) / 86400000) + 1,
      });
      streakStart = sorted[i];
      streakEnd = sorted[i];
    }
  }

  streaks.push({
    startDate: streakStart,
    endDate: streakEnd,
    length: Math.round((new Date(streakEnd) - new Date(streakStart)) / 86400000) + 1,
  });

  return streaks;
}

function generateRecommendedSchedule(hourlyAverage) {
  // Find the top 3 consecutive-hour blocks by total average
  const blocks = [];
  for (let start = 0; start < 24; start++) {
    let total = 0;
    for (let h = 0; h < 3; h++) {
      total += hourlyAverage[(start + h) % 24].avgMinutes;
    }
    blocks.push({ startHour: start, endHour: (start + 3) % 24, avgMinutes: total });
  }

  blocks.sort((a, b) => b.avgMinutes - a.avgMinutes);
  return blocks.slice(0, 2).map((b) => ({
    startHour: b.startHour,
    endHour: b.endHour,
    label: `${formatHour(b.startHour)} – ${formatHour(b.endHour)}`,
    avgMinutes: b.avgMinutes,
  }));
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

module.exports = {
  recordActivity,
  getMonthlyHeatmap,
  getYearlyHeatmap,
  getPeakHoursAnalysis,
  getStreakAnalytics,
  getDashboard,
  computeIntensityScore,
  getIntensityLevel,
  computeCurrentStreak,
  computeLongestStreak,
  INTENSITY_THRESHOLDS,
  FULL_DAY_MINUTES,
};
