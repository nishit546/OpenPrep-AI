const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * ConfidenceRating — records a student's self-reported confidence on a
 * topic alongside their actual quiz performance for that topic.
 *
 * The calibration engine compares these two signals to surface blind
 * spots: topics where the student is overconfident (high confidence,
 * low score) or underconfident (low confidence, high score).
 */
const ConfidenceRating = sequelize.define(
  'ConfidenceRating',
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
    confidence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 10 },
      comment: 'Self-reported confidence 1-10',
    },
    actualScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 100 },
      comment: 'Most recent quiz accuracy % for this topic',
    },
    calibrationGap: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'confidence_normalized - actualScore, positive = overconfident',
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Number of times this confidence rating was submitted',
    },
    quizAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastQuizDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('blind_spot', 'calibrated', 'underconfident', 'untested'),
      defaultValue: 'untested',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'confidencerating_user_topic_idx', fields: ['user', 'topicId'], unique: true },
      { name: 'confidencerating_user_status_idx', fields: ['user', 'status'] },
      { name: 'confidencerating_user_subject_idx', fields: ['user', 'subjectName'] },
    ],
  },
);

module.exports = ConfidenceRating;
