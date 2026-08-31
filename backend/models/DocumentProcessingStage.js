const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DocumentProcessingStage = sequelize.define(
  'DocumentProcessingStage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
      comment: 'Reference to the document being processed',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
    },
    stageName: {
      type: DataTypes.ENUM(
        'file-validation',
        'text-extraction',
        'content-normalization',
        'ai-analysis',
        'result-persistence'
      ),
      allowNull: false,
      index: true,
    },
    stageOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Sequential order of stages (1-5)',
    },
    status: {
      type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
      index: true,
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this stage was attempted',
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Maximum retry attempts allowed',
    },
    input: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Input data for this stage',
    },
    output: {
      type: DataTypes.LONGTEXT,
      allowNull: true,
      comment: 'Result/output from this stage',
    },
    error: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Error details if stage failed',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    retryScheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
      index: true,
      comment: 'When this stage is scheduled for retry',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Stage-specific metadata (duration, resource usage, etc.)',
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
      { fields: ['documentId', 'stageName'] },
      { fields: ['userId', 'status'] },
      { fields: ['retryScheduledFor', 'status'] },
    ],
  }
);

module.exports = DocumentProcessingStage;