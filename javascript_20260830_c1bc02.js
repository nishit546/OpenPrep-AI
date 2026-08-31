const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InterleavedPracticeSet = sequelize.define(
  'InterleavedPracticeSet',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    // Configuration
    interferenceLevel: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.5,
      validate: {
        min: 0,
        max: 1,
      },
    },
    questionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 2,
        max: 100,
      },
    },
    seed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Topics included in this set
    topicIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    // The ordered sequence of questions
    questionSequence: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of question IDs in practice order',
    },
    // Topic sequence (for analysis)
    topicSequence: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of topic IDs corresponding to questionSequence',
    },
    // Quality metrics
    switchRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Proportion of adjacent pairs that switch topics',
    },
    maxRunLength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Longest consecutive sequence of same topic',
    },
    sequenceEntropy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Shannon entropy of the topic distribution in sequence',
    },
    confusableAdjacencyRatio: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Proportion of adjacent pairs that are confusable topics',
    },
    // Status
    status: {
      type: DataTypes.ENUM('generated', 'in-progress', 'completed', 'abandoned'),
      allowNull: false,
      defaultValue: 'generated',
    },
    // Performance tracking
    results: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Per-question results { questionId: { correct, timeSpent, topicId } }',
    },
    // Delayed retention test results
    delayedRetentionResults: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Results from delayed retention test for comparison',
    },
    // Interleaving benefit score
    interleavingBenefit: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Difference between interleaved and blocked retention scores',
    },
    // Recommended interference level based on benefit
    recommendedInterferenceLevel: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    // Time tracking
    timeSpent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total time spent in seconds',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'createdAt'],
      },
      {
        fields: ['userId', 'status'],
      },
      {
        fields: ['userId', 'interferenceLevel'],
      },
    ],
  }
);

module.exports = InterleavedPracticeSet;