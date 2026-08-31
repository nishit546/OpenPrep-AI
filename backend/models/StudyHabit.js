const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyHabit — tracks individual study habits a student wants to build.
 *
 * Each habit represents a repeatable daily or weekly action (e.g.
 * "Review flashcards for 20 minutes", "Read one chapter", "Complete 1 quiz").
 * The habit tracker service uses these records to compute streaks,
 * consistency scores, and motivational insights.
 */
const StudyHabit = sequelize.define(
  'StudyHabit',
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
    subject: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Habit name is required' },
        len: { args: [1, 150], msg: 'Habit name must be between 1 and 150 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    habitType: {
      type: DataTypes.ENUM('daily', 'weekly', 'custom'),
      defaultValue: 'daily',
      allowNull: false,
    },
    frequency: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Times per period (e.g. 3 times per week)',
    },
    frequencyPeriod: {
      type: DataTypes.ENUM('day', 'week'),
      defaultValue: 'day',
    },
    targetMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Target duration in minutes per habit execution',
    },
    category: {
      type: DataTypes.ENUM(
        'review',
        'practice',
        'reading',
        'quiz',
        'flashcards',
        'notes',
        'discussion',
        'custom',
      ),
      defaultValue: 'custom',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'archived'),
      defaultValue: 'active',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    reminderTime: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'HH:MM format for daily reminder',
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'studyhabit_user_status_idx', fields: ['userId', 'status'] },
      { name: 'studyhabit_user_type_idx', fields: ['userId', 'habitType'] },
      { name: 'studyhabit_subject_idx', fields: ['subject'] },
      { name: 'studyhabit_user_category_idx', fields: ['userId', 'category'] },
    ],
  }
);

module.exports = (sequelizeInstance, dataTypes) => StudyHabit;

