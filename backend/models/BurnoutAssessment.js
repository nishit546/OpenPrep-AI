const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * BurnoutAssessment — records periodic burnout risk evaluations for users.
 * Each row captures a snapshot of the user's cognitive load, study intensity,
 * emotional state, and computed risk score at a point in time. Enables
 * trend analysis, early warning detection, and personalized recovery plans.
 */
const BurnoutAssessment = sequelize.define(
  'BurnoutAssessment',
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
    // Subjective stress level (1-10 scale, 10 = extreme stress)
    stressLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 10 },
    },
    // Number of hours studied in the past 24h
    studyHoursLast24h: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0 },
    },
    // Sleep quality self-report (1-10)
    sleepQuality: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: { min: 1, max: 10 },
    },
    // Number of consecutive study days without a break
    consecutiveStudyDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    // Motivation level (1-10)
    motivationLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: { min: 1, max: 10 },
    },
    // Physical fatigue indicator (1-10)
    fatigueLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: { min: 1, max: 10 },
    },
    // Social isolation score — days without social interaction (0-14)
    socialIsolationDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0, max: 14 },
    },
    // Computed burnout risk score (0-100, 100 = critical)
    riskScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    // Risk category derived from riskScore
    riskCategory: {
      type: DataTypes.ENUM('low', 'moderate', 'elevated', 'high', 'critical'),
      defaultValue: 'low',
    },
    // Quiz performance trend — percentage change over the last 7 days (-100 to 100)
    performanceTrend: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    // Free-text notes the user can attach
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // JSON array of active risk factors detected by the engine
    riskFactors: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    // JSON array of personalized recommendations
    recommendations: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'burnout_user_idx', fields: ['user'] },
      { name: 'burnout_user_date_idx', fields: ['user', 'createdAt'] },
      { name: 'burnout_risk_category_idx', fields: ['riskCategory'] },
    ],
  }
);

module.exports = BurnoutAssessment;
