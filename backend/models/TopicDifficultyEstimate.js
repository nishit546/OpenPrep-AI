const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * TopicDifficultyEstimate — stores estimated difficulty for each study topic,
 * computed from quiz performance, time investment, confidence ratings, and
 * historical trends.
 *
 * Difficulty is rated 1-10 (1 = trivial, 10 = extremely difficult). The
 * estimator updates difficulty dynamically as more data arrives, and stores
 * a history of estimates so trends can be visualised.
 */
const TopicDifficultyEstimate = sequelize.define(
  'TopicDifficultyEstimate',
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
    topicId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    topicName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    subjectName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ── Estimated Difficulty ──
    difficulty: {
      type: DataTypes.FLOAT,
      defaultValue: 5,
      validate: { min: 1, max: 10 },
      comment: 'Estimated difficulty 1-10',
    },
    difficultyLabel: {
      type: DataTypes.ENUM('trivial', 'easy', 'moderate', 'hard', 'extreme'),
      defaultValue: 'moderate',
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
      comment: 'How confident we are in this estimate (0-100)',
    },
    // ── Input Signals ──
    averageQuizScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Average quiz accuracy % for this topic',
    },
    quizCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalStudyMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    averageTimePerQuiz: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Average minutes per quiz attempt',
    },
    selfReportedDifficulty: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 1, max: 10 },
      comment: 'Student self-assessment (1-10)',
    },
    // ── Trend Data ──
    difficultyHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { date, difficulty, confidence }',
    },
    trend: {
      type: DataTypes.ENUM('harder', 'easier', 'stable', 'new'),
      defaultValue: 'new',
    },
    // ── Priority ──
    studyPriority: {
      type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
      defaultValue: 'medium',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'topicdiff_user_topic_idx', fields: ['user', 'topicId'], unique: true },
      { name: 'topicdiff_user_subject_idx', fields: ['user', 'subjectName'] },
      { name: 'topicdiff_user_priority_idx', fields: ['user', 'studyPriority'] },
      { name: 'topicdiff_user_difficulty_idx', fields: ['user', 'difficulty'] },
    ],
  },
);

module.exports = TopicDifficultyEstimate;
