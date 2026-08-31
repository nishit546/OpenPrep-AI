const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * SessionQualityScore — stores a multi-dimensional quality analysis of a
 * completed study session.
 *
 * Each score captures focus efficiency, study depth, knowledge retention
 * signals, and session health metrics, producing an overall grade (A–F)
 * with actionable improvement suggestions.
 */
const SessionQualityScore = sequelize.define(
  'SessionQualityScore',
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
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the source study session',
    },
    // ── Dimensional Scores (0-100 each) ──
    focusScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
      comment: 'Based on focus rating, interruptions, and session continuity',
    },
    efficiencyScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
      comment: 'Output per unit time: quizzes taken, flashcards reviewed, notes created',
    },
    retentionScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
      comment: 'Quiz accuracy and flashcard success rate during session',
    },
    healthScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
      comment: 'Session length appropriateness, time-of-day optimality, break compliance',
    },
    // ── Aggregate ──
    overallScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    grade: {
      type: DataTypes.ENUM('A+', 'A', 'B', 'C', 'D', 'F'),
      defaultValue: 'F',
    },
    // ── Context ──
    durationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subjectName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sessionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // ── Input signals used for scoring ──
    inputSignals: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Raw input data used to compute the scores',
    },
    // ── Suggestions ──
    suggestions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { category, message, priority }',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'sqscore_user_idx', fields: ['user'] },
      { name: 'sqscore_user_session_idx', fields: ['user', 'sessionId'], unique: true },
      { name: 'sqscore_user_date_idx', fields: ['user', 'sessionDate'] },
      { name: 'sqscore_user_grade_idx', fields: ['user', 'grade'] },
    ],
  },
);

module.exports = SessionQualityScore;
