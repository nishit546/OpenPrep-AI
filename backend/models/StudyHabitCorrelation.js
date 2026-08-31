const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyHabitCorrelation — stores individual data points linking a study
 * habit observation to the resulting quiz performance. The correlation
 * engine reads these to compute which habits correlate with better scores.
 *
 * Each row represents one "observation window" (e.g. a single day or
 * session) where we record what the user did and how they performed.
 */
const StudyHabitCorrelation = sequelize.define(
  'StudyHabitCorrelation',
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
    // ── Habit observation fields ───────────────────────────────────────
    /** Hour of day when the primary study session started (0-23, local time) */
    studyHourOfDay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 23 },
    },
    /** Day of week (0=Sun, 6=Sat) in the user's timezone */
    studyDayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 6 },
    },
    /** Duration of the study session in minutes */
    sessionDurationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    /** Number of flashcards reviewed in this window */
    flashcardsReviewed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    /** Number of quizzes attempted in this window */
    quizzesAttempted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    /** Number of notes read / pages studied */
    notesStudied: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    /** Whether the user took a break during this window */
    tookBreak: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    /** Previous study gap in hours (time since last session) */
    gapSinceLastSessionHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0 },
    },

    // ── Performance outcome fields ─────────────────────────────────────
    /** Average quiz score (0-100) achieved after this habit window */
    avgQuizScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    /** Flashcard retention rate (0-100) for cards reviewed in this window */
    flashcardRetentionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    /** Composite productivity score (0-100) combining all metrics */
    productivityScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },

    // ── Metadata ───────────────────────────────────────────────────────
    /** Date of the observation (for time-series grouping) */
    observationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'habitcorr_user_idx', fields: ['user'] },
      { name: 'habitcorr_user_date_idx', fields: ['user', 'observationDate'] },
      { name: 'habitcorr_user_hour_idx', fields: ['user', 'studyHourOfDay'] },
      { name: 'habitcorr_user_dow_idx', fields: ['user', 'studyDayOfWeek'] },
    ],
  }
);

module.exports = StudyHabitCorrelation;
