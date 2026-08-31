const { Op } = require('sequelize');
const { User, ActivityLog, QuizAttempt, StudyStreak, BurnoutAssessment } = require('../models');
const logger = require('../utils/logger');

/**
 * BurnoutPreventionService — analyses study behaviour, computes burnout risk
 * scores, detects early-warning patterns, and generates personalised recovery
 * recommendations based on the user's recent activity and assessment data.
 */
class BurnoutPreventionService {
  /**
   * Compute a weighted burnout risk score (0-100) from assessment inputs.
   *
   * Weights:
   *   stressLevel          25%
   *   fatigueLevel         15%
   *   sleepQuality         15% (inverted — low sleep = high risk)
   *   motivationLevel      10% (inverted)
   *   studyHoursLast24h    15% (over-studying raises risk)
   *   consecutiveStudyDays 10%
   *   socialIsolationDays  10%
   */
  computeRiskScore(assessment) {
    const stressComponent = (assessment.stressLevel / 10) * 25;
    const fatigueComponent = (assessment.fatigueLevel / 10) * 15;
    const sleepComponent = ((10 - assessment.sleepQuality) / 10) * 15;
    const motivationComponent = ((10 - assessment.motivationLevel) / 10) * 10;

    // Over 8 hours of study in 24h is a burnout trigger
    const overStudyHours = Math.max(0, assessment.studyHoursLast24h - 8);
    const studyComponent = (Math.min(overStudyHours, 8) / 8) * 15;

    // Consecutive days above 5 start contributing significantly
    const consecutiveComponent =
      (Math.min(assessment.consecutiveStudyDays, 10) / 10) * 10;

    const socialComponent =
      (Math.min(assessment.socialIsolationDays, 7) / 7) * 10;

    const raw =
      stressComponent +
      fatigueComponent +
      sleepComponent +
      motivationComponent +
      studyComponent +
      consecutiveComponent +
      socialComponent;

    return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
  }

  /**
   * Map a numeric risk score to a human-readable category.
   */
  categoriseRisk(score) {
    if (score >= 75) return 'critical';
    if (score >= 55) return 'high';
    if (score >= 35) return 'elevated';
    if (score >= 15) return 'moderate';
    return 'low';
  }

  /**
   * Detect which risk factors are active for a given assessment.
   * Returns an array of { factor, severity, message } objects.
   */
  detectRiskFactors(assessment, historicalData = {}) {
    const factors = [];

    if (assessment.stressLevel >= 8) {
      factors.push({
        factor: 'extreme_stress',
        severity: 'high',
        message: 'Your stress level is critically high. Immediate rest is strongly recommended.',
      });
    } else if (assessment.stressLevel >= 6) {
      factors.push({
        factor: 'elevated_stress',
        severity: 'moderate',
        message: 'Stress is elevated. Consider shortening study sessions today.',
      });
    }

    if (assessment.sleepQuality <= 3) {
      factors.push({
        factor: 'poor_sleep',
        severity: 'high',
        message: 'Very poor sleep quality detected. Sleep deprivation compounds all other burnout factors.',
      });
    } else if (assessment.sleepQuality <= 5) {
      factors.push({
        factor: 'suboptimal_sleep',
        severity: 'moderate',
        message: 'Sleep quality is below optimal. Aim for 7-9 hours of uninterrupted sleep.',
      });
    }

    if (assessment.studyHoursLast24h > 10) {
      factors.push({
        factor: 'overstudy',
        severity: 'high',
        message: `You studied ${assessment.studyHoursLast24h}h in 24 hours — well above the safe threshold of 8h.`,
      });
    } else if (assessment.studyHoursLast24h > 8) {
      factors.push({
        factor: 'excessive_study',
        severity: 'moderate',
        message: 'Study hours exceed the recommended daily limit. Diminishing returns set in after 8 hours.',
      });
    }

    if (assessment.consecutiveStudyDays >= 7) {
      factors.push({
        factor: 'no_rest_days',
        severity: 'high',
        message: `${assessment.consecutiveStudyDays} consecutive study days without a break. Rest days are essential for memory consolidation.`,
      });
    } else if (assessment.consecutiveStudyDays >= 5) {
      factors.push({
        factor: 'streak_risk',
        severity: 'moderate',
        message: 'Five or more consecutive study days. Consider scheduling a recovery day.',
      });
    }

    if (assessment.motivationLevel <= 2) {
      factors.push({
        factor: 'motivation_crash',
        severity: 'high',
        message: 'Motivation has crashed. This is a classic early burnout signal.',
      });
    } else if (assessment.motivationLevel <= 4) {
      factors.push({
        factor: 'low_motivation',
        severity: 'moderate',
        message: 'Motivation is flagging. A change of study activity or environment may help.',
      });
    }

    if (assessment.fatigueLevel >= 8) {
      factors.push({
        factor: 'extreme_fatigue',
        severity: 'high',
        message: 'Physical and mental fatigue are at dangerous levels. Stop studying and rest.',
      });
    } else if (assessment.fatigueLevel >= 6) {
      factors.push({
        factor: 'elevated_fatigue',
        severity: 'moderate',
        message: 'Fatigue is building. Take a 30-minute break and hydrate.',
      });
    }

    if (assessment.socialIsolationDays >= 5) {
      factors.push({
        factor: 'social_isolation',
        severity: 'high',
        message: `${assessment.socialIsolationDays} days without meaningful social interaction. Isolation accelerates burnout.`,
      });
    } else if (assessment.socialIsolationDays >= 3) {
      factors.push({
        factor: 'limited_social',
        severity: 'moderate',
        message: 'Limited social contact recently. Even brief interactions help recovery.',
      });
    }

    // Detect declining performance trend
    if (historicalData.performanceTrend < -15) {
      factors.push({
        factor: 'declining_performance',
        severity: 'high',
        message: `Quiz performance has dropped ${Math.abs(historicalData.performanceTrend).toFixed(0)}% over the past week. This may indicate cognitive overload.`,
      });
    } else if (historicalData.performanceTrend < -8) {
      factors.push({
        factor: 'mild_performance_dip',
        severity: 'moderate',
        message: 'A slight dip in quiz performance has been detected. Monitor this trend.',
      });
    }

    return factors;
  }

  /**
   * Generate personalised recommendations based on the detected risk factors
   * and the overall risk category.
   */
  generateRecommendations(riskCategory, riskFactors, assessment) {
    const recommendations = [];
    const factorTypes = riskFactors.map((f) => f.factor);

    // Universal high-risk recommendation
    if (riskCategory === 'critical') {
      recommendations.push({
        type: 'urgent_rest',
        priority: 'critical',
        title: 'Take an Immediate Break',
        description:
          'Your burnout risk is critical. Stop all studying for at least 24 hours. Sleep, eat well, and disconnect from academic work.',
        actionLabel: 'Start Recovery Mode',
      });
    }

    if (riskCategory === 'high' || riskCategory === 'critical') {
      recommendations.push({
        type: 'schedule_rest',
        priority: 'high',
        title: 'Schedule Recovery Days',
        description:
          'Block out at least 2 full rest days this week. No study materials, no quizzes — pure recovery.',
        actionLabel: 'Block Calendar',
      });
    }

    // Sleep-related recommendations
    if (factorTypes.includes('poor_sleep') || factorTypes.includes('suboptimal_sleep')) {
      recommendations.push({
        type: 'sleep_improvement',
        priority: 'high',
        title: 'Improve Sleep Quality',
        description:
          'Establish a consistent bedtime routine. Avoid screens 1 hour before bed. Keep your room cool and dark.',
        actionLabel: 'View Sleep Tips',
      });
    }

    // Overstudy recommendations
    if (factorTypes.includes('overstudy') || factorTypes.includes('excessive_study')) {
      recommendations.push({
        type: 'cap_study_hours',
        priority: 'high',
        title: 'Cap Daily Study at 6 Hours',
        description:
          'Research shows diminishing returns beyond 6-8 hours. Focus on quality over quantity — active recall beats passive reading.',
        actionLabel: 'Adjust Study Plan',
      });
    }

    // Motivation recommendations
    if (factorTypes.includes('motivation_crash') || factorTypes.includes('low_motivation')) {
      recommendations.push({
        type: 'reignite_motivation',
        priority: 'moderate',
        title: 'Reignite Your Motivation',
        description:
          'Switch to a topic you enjoy, try a study battle, or review your long-term goals. Small wins rebuild momentum.',
        actionLabel: 'Try Something Fun',
      });
    }

    // Fatigue recommendations
    if (factorTypes.includes('extreme_fatigue') || factorTypes.includes('elevated_fatigue')) {
      recommendations.push({
        type: 'physical_recovery',
        priority: 'high',
        title: 'Address Physical Fatigue',
        description:
          'Take a 20-minute walk, do light stretching, and drink at least 500ml of water. Physical activity directly improves cognitive function.',
        actionLabel: 'Start Break Timer',
      });
    }

    // Social isolation recommendations
    if (factorTypes.includes('social_isolation') || factorTypes.includes('limited_social')) {
      recommendations.push({
        type: 'social_connection',
        priority: 'moderate',
        title: 'Connect with Others',
        description:
          'Join a study squad session, chat with a study partner, or simply call a friend. Social connection is a powerful recovery tool.',
        actionLabel: 'Find Study Buddy',
      });
    }

    // Consecutive days recommendations
    if (factorTypes.includes('no_rest_days') || factorTypes.includes('streak_risk')) {
      recommendations.push({
        type: 'rest_day',
        priority: 'high',
        title: 'Take a Rest Day Today',
        description:
          'Memory consolidation happens during rest. Your brain literally strengthens neural pathways while you rest.',
        actionLabel: 'Log Rest Day',
      });
    }

    // Performance decline
    if (
      factorTypes.includes('declining_performance') ||
      factorTypes.includes('mild_performance_dip')
    ) {
      recommendations.push({
        type: 'review_strategy',
        priority: 'moderate',
        title: 'Review Your Study Strategy',
        description:
          'Declining performance may mean your study methods need refreshing. Try spaced repetition, practice testing, or teaching concepts to others.',
        actionLabel: 'Explore Techniques',
      });
    }

    // If no specific factors, provide general wellness tips
    if (recommendations.length === 0 && riskCategory !== 'low') {
      recommendations.push({
        type: 'maintain_balance',
        priority: 'low',
        title: 'Keep Up the Balance',
        description:
          'Your burnout risk is manageable. Keep maintaining your current healthy habits and check in again in a few days.',
        actionLabel: 'View Wellness Tips',
      });
    }

    // Always add a hydration reminder for moderate+ risk
    if (riskCategory !== 'low') {
      recommendations.push({
        type: 'hydration',
        priority: 'low',
        title: 'Stay Hydrated',
        description:
          'Dehydration impairs cognitive performance. Aim for 2-3 litres of water daily, more during intense study periods.',
        actionLabel: 'Set Water Reminder',
      });
    }

    return recommendations;
  }

  /**
   * Calculate the performance trend from recent quiz attempts.
   * Returns the percentage change over the past 7 days vs the 7 days before that.
   */
  async calculatePerformanceTrend(userId) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentAttempts = await QuizAttempt.findAll({
        where: {
          user: userId,
          createdAt: { [Op.gte]: sevenDaysAgo },
        },
        attributes: ['score', 'totalQuestions'],
      });

      const previousAttempts = await QuizAttempt.findAll({
        where: {
          user: userId,
          createdAt: { [Op.between]: [fourteenDaysAgo, sevenDaysAgo] },
        },
        attributes: ['score', 'totalQuestions'],
      });

      if (recentAttempts.length === 0 || previousAttempts.length === 0) {
        return 0;
      }

      const recentAvg =
        recentAttempts.reduce((sum, a) => {
          const pct = a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0;
          return sum + pct;
        }, 0) / recentAttempts.length;

      const previousAvg =
        previousAttempts.reduce((sum, a) => {
          const pct = a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0;
          return sum + pct;
        }, 0) / previousAttempts.length;

      if (previousAvg === 0) return 0;
      return Math.round(((recentAvg - previousAvg) / previousAvg) * 100 * 10) / 10;
    } catch (error) {
      logger.error('Failed to calculate performance trend', { userId, error: error.message });
      return 0;
    }
  }

  /**
   * Count consecutive study days for a user by examining ActivityLog entries.
   */
  async calculateConsecutiveStudyDays(userId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const logs = await ActivityLog.findAll({
        where: {
          user: userId,
          timestamp: { [Op.gte]: thirtyDaysAgo },
        },
        attributes: ['timestamp'],
        order: [['timestamp', 'DESC']],
      });

      if (logs.length === 0) return 0;

      // Extract unique dates (most recent first)
      const uniqueDates = [];
      const seen = new Set();
      for (const log of logs) {
        const dateStr = log.timestamp.toISOString().split('T')[0];
        if (!seen.has(dateStr)) {
          seen.add(dateStr);
          uniqueDates.push(dateStr);
        }
      }

      // Count consecutive days from today backwards
      let count = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDate = new Date(today);

      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (seen.has(dateStr)) {
          count++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return count;
    } catch (error) {
      logger.error('Failed to calculate consecutive study days', { userId, error: error.message });
      return 0;
    }
  }

  /**
   * Perform a full burnout assessment for a user.
   * Merges self-reported data with computed metrics from activity history.
   */
  async performAssessment(userId, selfReportedData) {
    const consecutiveDays = await this.calculateConsecutiveStudyDays(userId);
    const performanceTrend = await this.calculatePerformanceTrend(userId);

    const fullAssessment = {
      ...selfReportedData,
      consecutiveStudyDays: selfReportedData.consecutiveStudyDays ?? consecutiveDays,
    };

    const riskScore = this.computeRiskScore(fullAssessment);
    const riskCategory = this.categoriseRisk(riskScore);
    const riskFactors = this.detectRiskFactors(fullAssessment, { performanceTrend });
    const recommendations = this.generateRecommendations(riskCategory, riskFactors, fullAssessment);

    const record = await BurnoutAssessment.create({
      user: userId,
      stressLevel: fullAssessment.stressLevel,
      studyHoursLast24h: fullAssessment.studyHoursLast24h || 0,
      sleepQuality: fullAssessment.sleepQuality || 5,
      consecutiveStudyDays: fullAssessment.consecutiveStudyDays,
      motivationLevel: fullAssessment.motivationLevel || 5,
      fatigueLevel: fullAssessment.fatigueLevel || 5,
      socialIsolationDays: fullAssessment.socialIsolationDays || 0,
      riskScore,
      riskCategory,
      performanceTrend,
      notes: fullAssessment.notes || null,
      riskFactors,
      recommendations,
    });

    return record;
  }

  /**
   * Fetch the user's assessment history for trend analysis.
   */
  async getAssessmentHistory(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const { rows, count } = await BurnoutAssessment.findAndCountAll({
      where: { user: userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      assessments: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get the current burnout risk summary for a user.
   * Uses the latest assessment plus trend data from the past 30 days.
   */
  async getRiskSummary(userId) {
    const latest = await BurnoutAssessment.findOne({
      where: { user: userId },
      order: [['createdAt', 'DESC']],
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAssessments = await BurnoutAssessment.findAll({
      where: {
        user: userId,
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: ['riskScore', 'riskCategory', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    // Calculate trend direction
    let trendDirection = 'stable';
    let trendDelta = 0;
    if (recentAssessments.length >= 2) {
      const oldest = recentAssessments[0].riskScore;
      const newest = recentAssessments[recentAssessments.length - 1].riskScore;
      trendDelta = Math.round((newest - oldest) * 10) / 10;
      if (trendDelta > 5) trendDirection = 'worsening';
      else if (trendDelta < -5) trendDirection = 'improving';
    }

    // Category distribution over 30 days
    const categoryDistribution = { low: 0, moderate: 0, elevated: 0, high: 0, critical: 0 };
    recentAssessments.forEach((a) => {
      if (categoryDistribution[a.riskCategory] !== undefined) {
        categoryDistribution[a.riskCategory]++;
      }
    });

    // Average risk score over 30 days
    const avgRisk =
      recentAssessments.length > 0
        ? Math.round(
            (recentAssessments.reduce((sum, a) => sum + a.riskScore, 0) /
              recentAssessments.length) *
              10
          ) / 10
        : 0;

    return {
      currentRisk: latest
        ? {
            score: latest.riskScore,
            category: latest.riskCategory,
            riskFactors: latest.riskFactors,
            recommendations: latest.recommendations,
            assessedAt: latest.createdAt,
          }
        : null,
      trend: {
        direction: trendDirection,
        delta: trendDelta,
        averageScore30d: avgRisk,
        assessmentCount30d: recentAssessments.length,
      },
      categoryDistribution,
      riskLevelDescription: this.getRiskDescription(latest ? latest.riskCategory : 'low'),
    };
  }

  /**
   * Return a user-friendly description for each risk category.
   */
  getRiskDescription(category) {
    const descriptions = {
      low: 'You are in a healthy study zone. Keep up the great balance between study and rest!',
      moderate:
        'Your burnout risk is low but present. Maintain awareness of your stress levels and ensure you are taking regular breaks.',
      elevated:
        'Warning — your burnout risk is climbing. Consider reducing study load and prioritising sleep and social time.',
      high:
        'Your burnout risk is serious. Immediate changes to your schedule are recommended. Take at least one full rest day this week.',
      critical:
        'CRITICAL — you are at severe risk of burnout. Stop all non-essential study activity. Focus entirely on recovery: sleep, nutrition, social connection, and light physical activity.',
    };
    return descriptions[category] || descriptions.low;
  }
}

module.exports = new BurnoutPreventionService();
