const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FactualityVerificationLog = sequelize.define(
  'FactualityVerificationLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    targetType: {
      type: DataTypes.ENUM('flashcard', 'explanation', 'quiz_question', 'custom_text'),
      allowNull: false,
      defaultValue: 'flashcard',
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    factualityScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100,
      },
    },
    citationScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100,
      },
    },
    overallTrustScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100,
      },
    },
    status: {
      type: DataTypes.ENUM(
        'VERIFIED',
        'PARTIALLY_VERIFIED',
        'UNVERIFIED',
        'FACTUAL_INACCURACY',
        'HALLUCINATED_CITATION'
      ),
      allowNull: false,
      defaultValue: 'VERIFIED',
    },
    claims: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
    },
    citations: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
    },
    suggestedCorrections: {
      type: DataTypes.JSONB,
      defaultValue: null,
      allowNull: true,
    },
    sourceText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    analyzedContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'factuality_user_idx',
        fields: ['userId'],
      },
      {
        name: 'factuality_target_idx',
        fields: ['targetType', 'targetId'],
      },
      {
        name: 'factuality_status_idx',
        fields: ['status'],
      },
    ],
  }
);

module.exports = FactualityVerificationLog;
