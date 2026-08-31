const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyAnalyticsSnapshot — stores periodic analytics snapshots for a student.
 *
 * Each snapshot captures a point-in-time view of study consistency, subject
 * distribution, performance trends, and predictive projections. The service
 * layer generates these via a scheduled job or on-demand, and the controller
 * exposes them through a REST API for dashboard consumption.
 */
const StudyAnalyticsSnapshot = sequelize.define(
  'StudyAnalyticsSnapshot',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    snapshotDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    periodType: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'weekly',
      allowNull: false,
    },
    periodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    periodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // ── Consistency Metrics ──────────────────────────────────────────────
    totalStudySessions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalStudyMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageSessionMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    longestSessionMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    activeDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    consistencyScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: '0-100 score based on how evenly study is spread across the period',
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // ── Subject Distribution ─────────────────────────────────────────────
    subjectDistribution: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Map of subjectId -> { name, minutes, percentage, sessionCount }',
    },
    balanceScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: '0-100 measure of how evenly time is distributed across subjects',
    },
    mostStudiedSubject: {
      type: DataTypes.JSONB,
      defaultValue: null,
    },
    leastStudiedSubject: {
      type: DataTypes.JSONB,
      defaultValue: null,
    },

    // ── Performance Trends ───────────────────────────────────────────────
    quizzesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageQuizScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    quizScoreTrend: {
      type: DataTypes.ENUM('improving', 'declining', 'stable', 'insufficient_data'),
      defaultValue: 'insufficient_data',
    },
    improvementRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Percentage improvement per period in quiz scores',
    },
    flashcardsReviewed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    flashcardRetentionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Percentage of flashcards recalled correctly',
    },

    // ── Readiness Projections ────────────────────────────────────────────
    currentReadiness: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    readinessDelta: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Change in readiness since last snapshot',
    },
    projectedReadiness: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Projected readiness at the end of the current study plan',
    },
    readinessTrajectory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { date, actual, projected } for charting',
    },

    // ── Study Quality ────────────────────────────────────────────────────
    focusScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: '0-100 measure of study focus based on session patterns',
    },
    efficiencyRating: {
      type: DataTypes.ENUM('excellent', 'good', 'average', 'needs_improvement'),
      defaultValue: 'average',
    },
    peakStudyHour: {
      type: DataTypes.INTEGER,
      defaultValue: 9,
      comment: 'Hour of day (0-23) when most study happens',
    },
    dailyDistribution: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of 24 values representing study minutes per hour of day',
    },

    // ── Actionable Insights ──────────────────────────────────────────────
    insights: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { type, priority, message, actionable } objects',
    },
    recommendations: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { category, suggestion, impact } objects',
    },

    // ── Comparative Analytics ────────────────────────────────────────────
    comparedToPrevious: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'Delta object: { studyMinutes, quizScore, readiness, consistency } vs previous period',
    },

    // ── Metadata ─────────────────────────────────────────────────────────
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'studyanalytics_user_date_idx',
        fields: ['user', 'snapshotDate'],
      },
      {
        name: 'studyanalytics_user_period_idx',
        fields: ['user', 'periodType', 'periodStart'],
      },
      {
        name: 'studyanalytics_user_period_end_idx',
        fields: ['user', 'periodEnd'],
      },
    ],
  }
);

module.exports = StudyAnalyticsSnapshot;
