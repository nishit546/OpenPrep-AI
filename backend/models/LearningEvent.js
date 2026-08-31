const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * LearningEvent — immutable, append-only record of every learning action
 * (a quiz being scored, a flashcard being reviewed) that feeds derived
 * analytics.
 *
 * This is the single source of truth analytics is computed from. Progress
 * rows are a derived cache that can always be rebuilt by replaying these
 * events — see services/analyticsAggregationService.js.
 *
 * The unique index on (eventType, sourceId) is what makes applying an
 * event idempotent: trying to record the same source record twice (a
 * retried request, a re-run background job) fails the insert instead of
 * being applied to Progress a second time.
 */
const LearningEvent = sequelize.define(
  'LearningEvent',
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
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    topic: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    eventType: {
      type: DataTypes.ENUM('quiz_attempt', 'flashcard_review'),
      allowNull: false,
    },
    sourceId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Id of the record this event originated from (e.g. QuizAttempt.id, or a generated review id)',
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Data needed to (re)apply this event to Progress, e.g. { score } or { mastered }',
    },
  },
  {
    tableName: 'learning_events',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        name: 'learning_events_event_source_unique',
        unique: true,
        fields: ['eventType', 'sourceId'],
      },
      {
        name: 'learning_events_user_subject_topic_idx',
        fields: ['user', 'subject', 'topic'],
      },
    ],
  }
);

module.exports = LearningEvent;