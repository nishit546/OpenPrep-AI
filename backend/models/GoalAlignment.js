const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * GoalAlignment — stores a periodic snapshot comparing a student's actual
 * study time distribution against the ideal distribution derived from
 * subject weightages and declared goals.
 *
 * Each snapshot captures per-subject alignment scores, overall alignment,
 * recommended shifts, and trend data so the frontend can chart alignment
 * over time.
 */
const GoalAlignment = sequelize.define(
  'GoalAlignment',
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
    period: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'weekly',
    },
    periodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    periodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    overallScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    subjectBreakdown: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { subjectId, subjectName, idealPct, actualPct, gap, score }',
    },
    totalStudyMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalGoalMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    recommendations: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    trend: {
      type: DataTypes.ENUM('improving', 'stable', 'declining', 'new'),
      defaultValue: 'new',
    },
    previousScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'goalalign_user_period_idx', fields: ['user', 'period'] },
      { name: 'goalalign_user_dates_idx', fields: ['user', 'periodStart', 'periodEnd'] },
    ],
  },
);

module.exports = GoalAlignment;
