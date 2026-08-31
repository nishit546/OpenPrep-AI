const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * LearningJournal — stores aggregated learning journal entries.
 *
 * Each entry captures a day's worth of learning activities, milestones,
 * reflections, and performance summaries. The service layer auto-generates
 * entries by aggregating ActivityLog, QuizAttempt, FocusSession, and
 * other activity data, and also supports manual reflections.
 */
const LearningJournal = sequelize.define(
  'LearningJournal',
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
    entryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    entryType: {
      type: DataTypes.ENUM('auto', 'manual', 'milestone', 'reflection'),
      defaultValue: 'auto',
    },

    // ── Activity Summary ────────────────────────────────────────────────
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reflection: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User-written reflection or notes',
    },

    // ── Activity Counts ─────────────────────────────────────────────────
    studyMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    quizzesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageQuizScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    flashcardsReviewed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    notesCreated: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    focusSessions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    activitiesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // ── Milestones ──────────────────────────────────────────────────────
    milestones: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { type, label, description } achieved on this day',
    },
    streakDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // ── Performance ─────────────────────────────────────────────────────
    bestQuizScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    subjectsStudied: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { subjectId, name, minutes, quizCount }',
    },
    readinessDelta: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Change in readiness since yesterday',
    },

    // ── Mood & Sentiment ────────────────────────────────────────────────
    mood: {
      type: DataTypes.ENUM('great', 'good', 'okay', 'tired', 'stressed'),
      allowNull: true,
    },
    energyLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 },
    },

    // ── Metadata ────────────────────────────────────────────────────────
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'learningjournal_user_date_idx', fields: ['user', 'entryDate'], unique: true },
      { name: 'learningjournal_user_type_idx', fields: ['user', 'entryType'] },
      { name: 'learningjournal_user_created_idx', fields: ['user', 'createdAt'] },
    ],
  }
);

module.exports = LearningJournal;
