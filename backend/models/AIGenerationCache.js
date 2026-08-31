const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AIGenerationCache = sequelize.define(
  'AIGenerationCache',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fingerprint: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      index: true,
      comment: 'SHA-256 hash of generation inputs',
    },
    workflowType: {
      type: DataTypes.ENUM('quiz-generation', 'study-plan', 'document-analysis', 'flashcard-generation'),
      allowNull: false,
      index: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
      comment: 'User who generated this content',
    },
    contractVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'AI contract version at time of generation',
    },
    inputHash: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Fingerprint components for validation',
    },
    generatedResult: {
      type: DataTypes.LONGTEXT,
      allowNull: false,
      comment: 'Complete generated output',
    },
    resultMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Generation metadata (model, temp, tokens used)',
    },
    accessCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Number of times this cache was reused',
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      index: true,
      comment: 'Cache expiration time',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    indexes: [
      { fields: ['fingerprint', 'userId'] },
      { fields: ['workflowType', 'contractVersion', 'expiresAt'] },
      { fields: ['expiresAt'] },
    ],
  }
);

module.exports = AIGenerationCache;