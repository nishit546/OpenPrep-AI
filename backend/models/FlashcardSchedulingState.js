const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FlashcardSchedulingState = sequelize.define(
  'FlashcardSchedulingState',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    flashcardId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    schedulerVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    repetitionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    interval: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    easeFactor: {
      type: DataTypes.FLOAT,
      defaultValue: 2.5,
    },
    stability: {
      type: DataTypes.FLOAT,
      defaultValue: 2.4,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.FLOAT,
      defaultValue: 4.93,
      allowNull: true,
    },
    elapsedDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    scheduledDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    reps: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    lapses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    retrievability: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      allowNull: true,
    },
    nextReviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    timezoneIdentifier: {
      type: DataTypes.STRING,
      defaultValue: 'UTC',
    },
    state: {
      type: DataTypes.ENUM('new', 'learning', 'review', 'relearning'),
      defaultValue: 'new',
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'fss_flashcard_idx', fields: ['flashcardId'] },
      { name: 'fss_next_review_idx', fields: ['nextReviewDate'] },
      { name: 'fss_state_idx', fields: ['state'] },
    ],
  }
);

module.exports = FlashcardSchedulingState;