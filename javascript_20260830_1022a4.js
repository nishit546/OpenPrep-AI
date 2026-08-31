const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const HabitStreak = sequelize.define(
  'HabitStreak',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    habitId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'StudyHabits',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    // Current streak count
    currentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Longest streak achieved
    longestCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Start date of current streak
    streakStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Last completion date
    lastCompletionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Dates covered by current streak (for freeze tracking)
    streakDates: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of dates in current streak',
    },
    // Dates where freeze was used
    freezeDates: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of dates where freeze was used in current streak',
    },
    // Freezes available for this streak
    freezesAvailable: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 0,
        max: 3,
      },
    },
    // Freezes used in current streak
    freezesUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 3,
      },
    },
    // Last freeze reset date
    freezeResetDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Streak status
    status: {
      type: DataTypes.ENUM('active', 'broken', 'saved'),
      allowNull: false,
      defaultValue: 'active',
    },
    // When streak was broken
    brokenDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Next milestone target
    nextMilestone: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Next milestone target (e.g., 7, 14, 21, 30, 60, 90, 180, 365)',
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ['habitId'],
        unique: true,
      },
      {
        fields: ['userId', 'status'],
      },
      {
        fields: ['userId', 'currentCount'],
      },
    ],
  }
);

module.exports = HabitStreak;