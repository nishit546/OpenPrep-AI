const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * HabitStreak — tracks streak state for each StudyHabit.
 *
 * Maintains current streak, best streak, total completions,
 * and freeze information. Updated by the habit tracker service
 * whenever a HabitLog is created.
 */
const HabitStreak = sequelize.define(
  'HabitStreak',
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
      unique: true,
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Consecutive days/periods with completed logs',
    },
    bestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'All-time longest streak for this habit',
    },
    totalCompletions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalMinutesLogged: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastCompletedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    streakStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    freezeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of streak freezes used this month',
    },
    freezesUsed: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of dates when freezes were used',
    },
    consistencyScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: '0-100 score based on completion rate over last 30 days',
    },
    averageQuality: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Average quality rating across all logs',
    },
    averageMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Average actual minutes per completion',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'habitstreak_user_idx', fields: ['userId'] },
      { name: 'habitstreak_habit_idx', fields: ['habitId'], unique: true },
    ],
  }
);

module.exports = (sequelizeInstance, dataTypes) => HabitStreak;

