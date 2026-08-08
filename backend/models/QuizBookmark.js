const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// One row per bookmarked quiz question, so students can filter the review
// screen down to only the questions they've flagged for revision.
const QuizBookmark = sequelize.define(
  'QuizBookmark',
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
    quiz: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    questionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'quiz_bookmark_unique_idx',
        unique: true,
        fields: ['user', 'quiz', 'questionId'],
      },
      {
        name: 'quiz_bookmark_user_idx',
        fields: ['user'],
      },
    ],
  }
);

module.exports = QuizBookmark;