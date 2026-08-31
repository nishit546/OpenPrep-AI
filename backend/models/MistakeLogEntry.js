const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * MistakeLogEntry Model
 * Error-Taxonomy Root-Cause Classification for Question Mistakes & Redo Drills (#2003)
 */
const MistakeLogEntry = sequelize.define(
  'MistakeLogEntry',
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
    quizAttemptId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    quizId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    topicId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    questionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    options: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    correctAnswer: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userSelectedAnswer: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    marksLost: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    // Root Cause Taxonomy
    rootCause: {
      type: DataTypes.ENUM(
        'conceptual',
        'application',
        'careless',
        'misread',
        'time_pressure',
        'guessed',
        'knowledge_gap',
        'unclassified'
      ),
      defaultValue: 'unclassified',
    },
    heuristicPreFill: {
      type: DataTypes.STRING,
      defaultValue: 'unclassified',
    },
    heuristicConfidence: {
      type: DataTypes.FLOAT,
      defaultValue: 0.5,
    },
    timeSpentSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('open', 'resolved', 'ignored'),
      defaultValue: 'open',
    },
    recurrenceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    lastRedoAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    redoSuccessCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: 'mistake_log_entries',
    indexes: [
      {
        name: 'mistakelog_user_status_idx',
        fields: ['user', 'status'],
      },
      {
        name: 'mistakelog_user_rootcause_idx',
        fields: ['user', 'rootCause'],
      },
      {
        name: 'mistakelog_user_subject_idx',
        fields: ['user', 'subjectId'],
      },
      {
        name: 'mistakelog_user_topic_idx',
        fields: ['user', 'topicId'],
      },
      {
        name: 'mistakelog_user_question_idx',
        fields: ['user', 'questionId'],
      },
    ],
  }
);

module.exports = MistakeLogEntry;
