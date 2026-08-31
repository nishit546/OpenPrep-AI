const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyHeatmap — records granular study activity for heatmap visualisation,
 * peak-hour analysis, and streak computation.
 *
 * Each row represents one calendar day of aggregated study data for a user.
 * The `hourlyBreakdown` JSONB field stores minutes studied per hour (0–23),
 * enabling heatmap rendering and peak-hour identification.
 */
const StudyHeatmap = sequelize.define(
  'StudyHeatmap',
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    totalMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 },
    },
    sessionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    hourlyBreakdown: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Key = hour (0-23), Value = minutes studied in that hour',
    },
    subjectsStudied: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { subjectId, subjectName, minutes }',
    },
    quizScores: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { quizId, score, totalQuestions }',
    },
    flashcardsReviewed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    peakHour: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 23 },
    },
    intensityScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Normalised 0-100 score representing daily study intensity',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'studyheatmap_user_date_idx', fields: ['user', 'date'], unique: true },
      { name: 'studyheatmap_user_intensity_idx', fields: ['user', 'intensityScore'] },
    ],
  },
);

module.exports = StudyHeatmap;
