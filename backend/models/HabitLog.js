const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * HabitLog — individual log entries for habit completions.
 *
 * Each log records a single execution of a StudyHabit, including
 * the actual duration, quality rating, and any notes. The service
 * layer aggregates these to compute streaks, consistency, and analytics.
 */
const HabitLog = sequelize.define(
  'HabitLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    habitId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    logDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    actualMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Actual time spent in minutes',
    },
    quality: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 },
      comment: 'Self-rated quality 1-5',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mood: {
      type: DataTypes.ENUM('great', 'good', 'okay', 'tired', 'stressed'),
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
      { name: 'habitlog_user_habit_idx', fields: ['userId', 'habitId'] },
      { name: 'habitlog_user_date_idx', fields: ['userId', 'logDate'] },
      { name: 'habitlog_habit_date_idx', fields: ['habitId', 'logDate'] },
    ],
  }
);

module.exports = (sequelizeInstance, dataTypes) => HabitLog;

