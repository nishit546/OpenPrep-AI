const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AIWorkflowContract = sequelize.define(
  'AIWorkflowContract',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workflowType: {
      type: DataTypes.ENUM('quiz-generation', 'study-plan', 'document-analysis', 'flashcard-generation'),
      allowNull: false,
      index: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    promptTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expectedResponseSchema: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON Schema for validating responses',
    },
    modelConfig: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Temperature, max tokens, stop sequences, etc.',
    },
    parsingStrategy: {
      type: DataTypes.ENUM('json-strict', 'markdown-extraction', 'regex-pattern'),
      allowNull: false,
    },
    validationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Custom validation rules beyond schema',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    changelog: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ['workflowType', 'version', 'isActive'] },
    ],
  }
);

module.exports = AIWorkflowContract;