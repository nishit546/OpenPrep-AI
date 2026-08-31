const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyTimeBudget — allows students to set weekly time budgets per subject
 * and tracks actual study time against those budgets. Each row represents
 * one subject's budget allocation for a specific week.
 */
const StudyTimeBudget = sequelize.define(
  'StudyTimeBudget',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user: { type: DataTypes.UUID, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    /** Planned weekly study minutes for this subject */
    plannedMinutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    /** Actual minutes studied this week (updated by tracking) */
    actualMinutes: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
    /** ISO week string e.g. "2026-W35" */
    weekKey: { type: DataTypes.STRING, allowNull: false },
    /** Priority weight 1-5 */
    priority: { type: DataTypes.INTEGER, defaultValue: 3, validate: { min: 1, max: 5 } },
    /** Optional notes about this budget */
    notes: { type: DataTypes.TEXT, allowNull: true },
    /** Soft cap: whether to alert when approaching limit */
    alertThreshold: { type: DataTypes.INTEGER, defaultValue: 80, validate: { min: 0, max: 100 } },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'timebudget_user_idx', fields: ['user'] },
      { name: 'timebudget_user_week_idx', fields: ['user', 'weekKey'], unique: true },
      { name: 'timebudget_user_subject_idx', fields: ['user', 'subject'] },
    ],
  }
);

module.exports = StudyTimeBudget;
