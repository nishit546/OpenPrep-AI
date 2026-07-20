const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const QuizAttempt = sequelize.define(
  'QuizAttempt',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.id;
      },
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quiz: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    answers: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    weakTopics: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    strongTopics: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'quizattempt_user_idx',
        fields: ['user'],
      },
      {
        name: 'quizattempt_quiz_idx',
        fields: ['quiz'],
      },
      {
        name: 'quizattempt_user_quiz_idx',
        fields: ['user', 'quiz'],
      },
    ],
  }
);

module.exports = QuizAttempt;
