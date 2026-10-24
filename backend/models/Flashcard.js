const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const searchIndex = require('../services/searchIndexService');

const Flashcard = sequelize.define(
  'Flashcard',
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
    },
    front: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a question or term for the front' },
      },
    },
    back: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add an answer or definition for the back' },
      },
    },
    interval: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    repetitions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    efactor: {
      type: DataTypes.FLOAT,
      defaultValue: 2.5,
    },
    nextReviewDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    stability: {
      type: DataTypes.FLOAT,
      defaultValue: 2.4,
      allowNull: true,
    },
    fsrsDifficulty: {
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
    state: {
      type: DataTypes.ENUM('new', 'learning', 'review', 'relearning'),
      defaultValue: 'new',
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      allowNull: true,
    },
    hint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timestampSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deckId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'flashcard_user_idx',
        fields: ['user'],
      },
      {
        name: 'flashcard_subject_idx',
        fields: ['subject'],
      },
      {
        name: 'flashcard_topic_idx',
        fields: ['topic'],
      },
      {
        name: 'flashcard_user_subject_idx',
        fields: ['user', 'subject'],
      },
      {
        name: 'idx_flashcards_user_next_review',
        fields: ['user', 'nextReviewDate'],
      },
      {
        name: 'idx_flashcards_user_topic',
        fields: ['user', 'topic'],
      },
    ],
  }
);

const cacheManager = require('../utils/cacheManager');

Flashcard.afterSave(async (flashcard, options) => {
  searchIndex.enqueueIndex('flashcard', flashcard);
  try {
    const pattern = `user_${flashcard.user}:*`;
    await cacheManager.invalidate(pattern);
  } catch (err) {
    console.error('Error invalidating cache after Flashcard save:', err);
  }
});

Flashcard.afterDestroy(async (flashcard, options) => {
  searchIndex.removeRecord('flashcard', flashcard);
  try {
    const pattern = `user_${flashcard.user}:*`;
    await cacheManager.invalidate(pattern);
  } catch (err) {
    console.error('Error invalidating cache after Flashcard destroy:', err);
  }
});

module.exports = Flashcard;
