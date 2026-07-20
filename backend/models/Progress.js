const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Progress = sequelize.define(
  'Progress',
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
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    topic: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    completionPercentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    studyHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    quizScores: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    flashcardsMastered: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'progress_user_idx',
        fields: ['user'],
      },
      {
        name: 'progress_subject_idx',
        fields: ['subject'],
      },
      {
        name: 'progress_topic_idx',
        fields: ['topic'],
      },
      {
        name: 'progress_user_subject_idx',
        fields: ['user', 'subject'],
      },
    ],
  }
);

module.exports = Progress;
