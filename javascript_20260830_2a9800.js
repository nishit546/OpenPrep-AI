const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const HabitLog = sequelize.define(
  'HabitLog',
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
    // Completion date
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // Time spent (minutes)
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 1440,
      },
    },
    // Quality rating (1-5)
    quality: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    // Mood rating (1-5)
    mood: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    // Energy level (1-5)
    energy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    // Notes about the session
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Completion context
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Whether streak freeze was used for this day
    usedFreeze: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Source of completion (manual, auto, api)
    source: {
      type: DataTypes.ENUM('manual', 'auto', 'api', 'reminder'),
      allowNull: false,
      defaultValue: 'manual',
    },
    // Device info
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Session metadata
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ['habitId', 'date'],
        unique: true,
      },
      {
        fields: ['userId', 'date'],
      },
      {
        fields: ['habitId', 'date', 'usedFreeze'],
      },
      {
        fields: ['userId', 'quality'],
      },
    ],
  }
);

module.exports = HabitLog;