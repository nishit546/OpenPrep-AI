const { Op } = require('sequelize');
const { StudyHabitCorrelation } = require('../models');

/**
 * HabitCorrelationService — analyses study habit data points to find
 * statistically meaningful correlations between what students do and
 * how well they perform. Returns actionable insights.
 */
class HabitCorrelationService {
  /**
   * Record a single habit-performance observation.
   * Called after a quiz attempt or flashcard review session.
   */
  async recordObservation(userId, data) {
    return StudyHabitCorrelation.create({
      user: userId,
      studyHourOfDay: data.studyHourOfDay,
      studyDayOfWeek: data.studyDayOfWeek,
      sessionDurationMinutes: data.sessionDurationMinutes || 0,
      flashcardsReviewed: data.flashcardsReviewed || 0,
      quizzesAttempted: data.quizzesAttempted || 0,
      notesStudied: data.notesStudied || 0,
      tookBreak: data.tookBreak || false,
      gapSinceLastSessionHours: data.gapSinceLastSessionHours || 0,
      avgQuizScore: data.avgQuizScore || 0,
      flashcardRetentionRate: data.flashcardRetentionRate || 0,
      productivityScore: data.productivityScore || 0,
      observationDate: data.observationDate || new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Get the user's correlation summary across all habit dimensions.
   * Returns an array of correlation insights with effect sizes.
   */
  async getCorrelationSummary(userId) {
    const observations = await StudyHabitCorrelation.findAll({
      where: { user: userId },
      order: [['observationDate', 'DESC']],
      limit: 365, // last year of data
    });

    if (observations.length < 5) {
      return {
        hasEnoughData: false,
        message: `Need at least 5 study sessions recorded. Currently have ${observations.length}. Keep studying!`,
        correlations: [],
        overallInsights: [],
      };
    }

    const data = observations.map((o) => o.toJSON());

    const correlations = [
      this._correlateTimeOfDay(data),
      this._correlateDayOfWeek(data),
      this._correlateSessionDuration(data),
      this._correlateBreaks(data),
      this._correlateStudyGap(data),
      this._correlateFlashcardVolume(data),
      this._correlateMixedActivities(data),
    ].filter(Boolean);

    const overallInsights = this._generateOverallInsights(correlations, data);

    return {
      hasEnoughData: true,
      totalObservations: data.length,
      dateRange: {
        from: data[data.length - 1]?.observationDate,
        to: data[0]?.observationDate,
      },
      correlations,
      overallInsights,
    };
  }

  /**
   * Get a breakdown of average performance grouped by hour of day.
   */
  async getPerformanceByHour(userId) {
    const observations = await StudyHabitCorrelation.findAll({
      where: { user: userId },
      attributes: [
        'studyHourOfDay',
        [StudyHabitCorrelation.sequelize.fn('AVG', StudyHabitCorrelation.col('avgQuizScore')), 'avgScore'],
        [StudyHabitCorrelation.sequelize.fn('AVG', StudyHabitCorrelation.col('flashcardRetentionRate')), 'avgRetention'],
        [StudyHabitCorrelation.sequelize.fn('AVG', StudyHabitCorrelation.col('productivityScore')), 'avgProductivity'],
        [StudyHabitCorrelation.sequelize.fn('COUNT', StudyHabitCorrelation.col('id')), 'sessionCount'],
      ],
      where: { user: userId },
      group: ['studyHourOfDay'],
      order: [['studyHourOfDay', 'ASC']],
    });

    return observations.map((o) => ({
      hour: o.studyHourOfDay,
      avgScore: Math.round(parseFloat(o.getDataValue('avgScore')) || 0),
      avgRetention: Math.round(parseFloat(o.getDataValue('avgRetention')) || 0),
      avgProductivity: Math.round(parseFloat(o.getDataValue('avgProductivity')) || 0),
      sessionCount: parseInt(o.getDataValue('sessionCount'), 10),
    }));
  }

  /**
   * Get a breakdown of average performance grouped by day of week.
   */
  async getPerformanceByDay(userId) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const observations = await StudyHabitCorrelation.findAll({
      attributes: [
        'studyDayOfWeek',
        [StudyHabitCorrelation.sequelize.fn('AVG', StudyHabitCorrelation.col('avgQuizScore')), 'avgScore'],
        [StudyHabitCorrelation.sequelize.fn('AVG', StudyHabitCorrelation.col('flashcardRetentionRate')), 'avgRetention'],
        [StudyHabitCorrelation.sequelize.fn('AVG', StudyHabitCorrelation.col('sessionDurationMinutes')), 'avgDuration'],
        [StudyHabitCorrelation.sequelize.fn('COUNT', StudyHabitCorrelation.col('id')), 'sessionCount'],
      ],
      where: { user: userId },
      group: ['studyDayOfWeek'],
      order: [['studyDayOfWeek', 'ASC']],
    });

    return observations.map((o) => ({
      dayOfWeek: o.studyDayOfWeek,
      dayName: dayNames[o.studyDayOfWeek] || 'Unknown',
      avgScore: Math.round(parseFloat(o.getDataValue('avgScore')) || 0),
      avgRetention: Math.round(parseFloat(o.getDataValue('avgRetention')) || 0),
      avgDuration: Math.round(parseFloat(o.getDataValue('avgDuration')) || 0),
      sessionCount: parseInt(o.getDataValue('sessionCount'), 10),
    }));
  }

  /**
   * Get the optimal study schedule recommendation based on historical data.
   */
  async getOptimalSchedule(userId) {
    const hourData = await this.getPerformanceByHour(userId);
    const dayData = await this.getPerformanceByDay(userId);

    if (hourData.length === 0 || dayData.length === 0) {
      return {
        hasEnoughData: false,
        recommendation: 'Complete more study sessions to unlock optimal schedule recommendations.',
        bestHours: [],
        bestDays: [],
      };
    }

    // Find best hours (top 3 by productivity score, min 2 sessions)
    const qualifiedHours = hourData.filter((h) => h.sessionCount >= 2);
    const bestHours = qualifiedHours
      .sort((a, b) => b.avgProductivity - a.avgProductivity)
      .slice(0, 3)
      .map((h) => ({
        hour: h.hour,
        label: this._formatHour(h.hour),
        avgScore: h.avgScore,
        avgProductivity: h.avgProductivity,
        sessions: h.sessionCount,
      }));

    // Find best days (top 3 by avg score, min 2 sessions)
    const qualifiedDays = dayData.filter((d) => d.sessionCount >= 2);
    const bestDays = qualifiedDays
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        avgScore: d.avgScore,
        sessions: d.sessionCount,
      }));

    const recommendation = this._buildScheduleRecommendation(bestHours, bestDays);

    return {
      hasEnoughData: true,
      recommendation,
      bestHours,
      bestDays,
    };
  }

  // ── Private correlation methods ──────────────────────────────────────

  _correlateTimeOfDay(data) {
    const buckets = { morning: [], afternoon: [], evening: [], night: [] };
    data.forEach((d) => {
      const hour = d.studyHourOfDay;
      if (hour >= 5 && hour < 12) buckets.morning.push(d.avgQuizScore);
      else if (hour >= 12 && hour < 17) buckets.afternoon.push(d.avgQuizScore);
      else if (hour >= 17 && hour < 21) buckets.evening.push(d.avgQuizScore);
      else buckets.night.push(d.avgQuizScore);
    });

    const avgs = {};
    for (const [period, scores] of Object.entries(buckets)) {
      if (scores.length >= 2) {
        avgs[period] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      }
    }

    if (Object.keys(avgs).length < 2) return null;

    const sorted = Object.entries(avgs).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const delta = Math.round((best[1] - worst[1]) * 10) / 10;

    return {
      dimension: 'timeOfDay',
      title: 'Study Time Effectiveness',
      icon: '🕐',
      bestPeriod: best[0],
      bestAvgScore: best[1],
      worstPeriod: worst[0],
      worstAvgScore: worst[1],
      scoreDelta: delta,
      strength: delta > 10 ? 'strong' : delta > 5 ? 'moderate' : 'weak',
      detail: `You score ${delta}% higher when studying in the ${best[0]} vs ${worst[0]}.`,
    };
  }

  _correlateDayOfWeek(data) {
    const buckets = {};
    data.forEach((d) => {
      if (!buckets[d.studyDayOfWeek]) buckets[d.studyDayOfWeek] = [];
      buckets[d.studyDayOfWeek].push(d.avgQuizScore);
    });

    const avgs = {};
    for (const [day, scores] of Object.entries(buckets)) {
      if (scores.length >= 2) {
        avgs[day] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      }
    }

    if (Object.keys(avgs).length < 2) return null;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sorted = Object.entries(avgs).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const delta = Math.round((best[1] - worst[1]) * 10) / 10;

    return {
      dimension: 'dayOfWeek',
      title: 'Best Day to Study',
      icon: '📅',
      bestPeriod: dayNames[best[0]],
      bestAvgScore: best[1],
      worstPeriod: dayNames[worst[0]],
      worstAvgScore: worst[1],
      scoreDelta: delta,
      strength: delta > 10 ? 'strong' : delta > 5 ? 'moderate' : 'weak',
      detail: `You perform ${delta}% better on ${dayNames[best[0]]}s compared to ${dayNames[worst[0]]}s.`,
    };
  }

  _correlateSessionDuration(data) {
    const buckets = { short: [], medium: [], long: [] };
    data.forEach((d) => {
      const mins = d.sessionDurationMinutes;
      if (mins > 0 && mins <= 30) buckets.short.push(d.avgQuizScore);
      else if (mins > 30 && mins <= 90) buckets.medium.push(d.avgQuizScore);
      else if (mins > 90) buckets.long.push(d.avgQuizScore);
    });

    const avgs = {};
    const labels = { short: '15-30 min', medium: '30-90 min', long: '90+ min' };
    for (const [dur, scores] of Object.entries(buckets)) {
      if (scores.length >= 2) {
        avgs[dur] = {
          avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          label: labels[dur],
        };
      }
    }

    if (Object.keys(avgs).length < 2) return null;

    const sorted = Object.entries(avgs).sort((a, b) => b[1].avg - a[1].avg);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const delta = Math.round((best[1].avg - worst[1].avg) * 10) / 10;

    return {
      dimension: 'sessionDuration',
      title: 'Optimal Session Length',
      icon: '⏱️',
      bestPeriod: best[1].label,
      bestAvgScore: best[1].avg,
      worstPeriod: worst[1].label,
      worstAvgScore: worst[1].avg,
      scoreDelta: delta,
      strength: delta > 10 ? 'strong' : delta > 5 ? 'moderate' : 'weak',
      detail: `Sessions of ${best[1].label} yield ${delta}% higher scores than ${worst[1].label} sessions.`,
    };
  }

  _correlateBreaks(data) {
    const withBreak = data.filter((d) => d.tookBreak && d.avgQuizScore > 0);
    const noBreak = data.filter((d) => !d.tookBreak && d.avgQuizScore > 0);

    if (withBreak.length < 2 || noBreak.length < 2) return null;

    const avgWith = withBreak.reduce((s, d) => s + d.avgQuizScore, 0) / withBreak.length;
    const avgWithout = noBreak.reduce((s, d) => s + d.avgQuizScore, 0) / noBreak.length;
    const delta = Math.round((avgWith - avgWithout) * 10) / 10;

    return {
      dimension: 'breaks',
      title: 'Impact of Taking Breaks',
      icon: '☕',
      bestPeriod: 'with breaks',
      bestAvgScore: Math.round(avgWith * 10) / 10,
      worstPeriod: 'without breaks',
      worstAvgScore: Math.round(avgWithout * 10) / 10,
      scoreDelta: delta,
      strength: Math.abs(delta) > 10 ? 'strong' : Math.abs(delta) > 5 ? 'moderate' : 'weak',
      detail: delta > 0
        ? `Taking breaks correlates with ${Math.abs(delta)}% higher scores.`
        : `No significant benefit from breaks detected yet (${Math.abs(delta)}% difference).`,
    };
  }

  _correlateStudyGap(data) {
    const recent = data.filter((d) => d.gapSinceLastSessionHours > 0 && d.gapSinceLastSessionHours <= 24);
    const spaced = data.filter((d) => d.gapSinceLastSessionHours > 24 && d.gapSinceLastSessionHours <= 72);

    if (recent.length < 2 || spaced.length < 2) return null;

    const avgRecent = recent.reduce((s, d) => s + d.avgQuizScore, 0) / recent.length;
    const avgSpaced = spaced.reduce((s, d) => s + d.avgQuizScore, 0) / spaced.length;
    const delta = Math.round((avgSpaced - avgRecent) * 10) / 10;

    return {
      dimension: 'studyGap',
      title: 'Spaced Repetition Effect',
      icon: '🔄',
      bestPeriod: '24-72h gap',
      bestAvgScore: Math.round(avgSpaced * 10) / 10,
      worstPeriod: '<24h gap',
      worstAvgScore: Math.round(avgRecent * 10) / 10,
      scoreDelta: delta,
      strength: Math.abs(delta) > 10 ? 'strong' : Math.abs(delta) > 5 ? 'moderate' : 'weak',
      detail: delta > 0
        ? `Reviewing after 24-72h gives you ${delta}% better retention — spaced repetition works!`
        : `Shorter gaps seem fine for now. Try spacing reviews to test the effect.`,
    };
  }

  _correlateFlashcardVolume(data) {
    const low = data.filter((d) => d.flashcardsReviewed > 0 && d.flashcardsReviewed <= 10);
    const medium = data.filter((d) => d.flashcardsReviewed > 10 && d.flashcardsReviewed <= 30);
    const high = data.filter((d) => d.flashcardsReviewed > 30);

    const buckets = {};
    if (low.length >= 2) buckets['1-10'] = low.reduce((s, d) => s + d.flashcardRetentionRate, 0) / low.length;
    if (medium.length >= 2) buckets['11-30'] = medium.reduce((s, d) => s + d.flashcardRetentionRate, 0) / medium.length;
    if (high.length >= 2) buckets['30+'] = high.reduce((s, d) => s + d.flashcardRetentionRate, 0) / high.length;

    if (Object.keys(buckets).length < 2) return null;

    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const delta = Math.round((best[1] - worst[1]) * 10) / 10;

    return {
      dimension: 'flashcardVolume',
      title: 'Optimal Flashcard Volume',
      icon: '🃏',
      bestPeriod: `${best[0]} cards`,
      bestAvgScore: Math.round(best[1] * 10) / 10,
      worstPeriod: `${worst[0]} cards`,
      worstAvgScore: Math.round(worst[1] * 10) / 10,
      scoreDelta: delta,
      strength: delta > 10 ? 'strong' : delta > 5 ? 'moderate' : 'weak',
      detail: `Reviewing ${best[0]} flashcards per session gives ${delta}% better retention than ${worst[0]}.`,
    };
  }

  _correlateMixedActivities(data) {
    const mixed = data.filter((d) => d.flashcardsReviewed > 0 && d.quizzesAttempted > 0 && d.notesStudied > 0);
    const single = data.filter((d) => {
      const count = [d.flashcardsReviewed > 0, d.quizzesAttempted > 0, d.notesStudied > 0].filter(Boolean).length;
      return count <= 1 && d.avgQuizScore > 0;
    });

    if (mixed.length < 2 || single.length < 2) return null;

    const avgMixed = mixed.reduce((s, d) => s + d.avgQuizScore, 0) / mixed.length;
    const avgSingle = single.reduce((s, d) => s + d.avgQuizScore, 0) / single.length;
    const delta = Math.round((avgMixed - avgSingle) * 10) / 10;

    return {
      dimension: 'mixedActivities',
      title: 'Multi-Activity Sessions',
      icon: '🎯',
      bestPeriod: 'mixed activities',
      bestAvgScore: Math.round(avgMixed * 10) / 10,
      worstPeriod: 'single activity',
      worstAvgScore: Math.round(avgSingle * 10) / 10,
      scoreDelta: delta,
      strength: Math.abs(delta) > 8 ? 'strong' : Math.abs(delta) > 4 ? 'moderate' : 'weak',
      detail: delta > 0
        ? `Mixing flashcards, quizzes, and notes in one session boosts scores by ${delta}%.`
        : `Single-focus sessions work well for you. Stick with what works.`,
    };
  }

  _generateOverallInsights(correlations, data) {
    const insights = [];

    // Overall average
    const allScores = data.filter((d) => d.avgQuizScore > 0).map((d) => d.avgQuizScore);
    if (allScores.length > 0) {
      const overallAvg = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
      insights.push({
        type: 'overall',
        icon: '📊',
        text: `Your overall average quiz score across ${allScores.length} sessions is ${overallAvg}%.`,
      });
    }

    // Strongest correlation
    const strong = correlations.filter((c) => c.strength === 'strong');
    if (strong.length > 0) {
      const strongest = strong.sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta))[0];
      insights.push({
        type: 'strongest',
        icon: '💡',
        text: `Your strongest performance factor is ${strongest.title.toLowerCase()}: ${strongest.detail}`,
      });
    }

    // Improvement trend
    const recentScores = data.slice(0, 10).filter((d) => d.avgQuizScore > 0).map((d) => d.avgQuizScore);
    const olderScores = data.slice(10, 20).filter((d) => d.avgQuizScore > 0).map((d) => d.avgQuizScore);
    if (recentScores.length >= 3 && olderScores.length >= 3) {
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
      const trend = Math.round((recentAvg - olderAvg) * 10) / 10;
      if (trend > 3) {
        insights.push({
          type: 'trend',
          icon: '📈',
          text: `Great progress! Your scores improved by ${trend}% in recent sessions compared to earlier ones.`,
        });
      } else if (trend < -3) {
        insights.push({
          type: 'trend',
          icon: '📉',
          text: `Scores dipped by ${Math.abs(trend)}% recently. Consider adjusting your study habits.`,
        });
      }
    }

    return insights;
  }

  _formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  }

  _buildScheduleRecommendation(bestHours, bestDays) {
    if (bestHours.length === 0 && bestDays.length === 0) {
      return 'Keep studying to build enough data for personalized recommendations!';
    }

    const parts = [];
    if (bestHours.length > 0) {
      const hours = bestHours.map((h) => h.label).join(' and ');
      parts.push(`Study during ${hours}`);
    }
    if (bestDays.length > 0) {
      const days = bestDays.map((d) => d.dayName).join(' and ');
      parts.push(`Focus on ${days}`);
    }
    parts.push('Take regular breaks between sessions.');
    parts.push('Space your reviews 24-72 hours apart for best retention.');

    return parts.join('. ') + '.';
  }
}

module.exports = new HabitCorrelationService();
