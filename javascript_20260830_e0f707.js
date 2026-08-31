const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ExplainBackAttempt = sequelize.define(
  'ExplainBackAttempt',
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
    conceptId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Topics',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    // Source can be a Topic, Note, or custom key points
    sourceType: {
      type: DataTypes.ENUM('topic', 'note', 'custom'),
      allowNull: false,
      defaultValue: 'topic',
    },
    sourceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // The key points extracted from the source
    sourceKeyPoints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of key point strings extracted from the source',
    },
    // The user's explanation text
    explanation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Version number (1 = first attempt, 2 = second, etc.)
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    // Coverage score: percentage of key points covered
    coverageScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Array of matched key points (the ones covered)
    matchedPoints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    // Array of missed key points (the gaps)
    missedPoints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    // Jargon density: ratio of technical terms to total words
    jargonDensity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Simplicity score: readability measure (higher = simpler)
    simplicityScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Average sentence length in words
    avgSentenceLength: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    // Total word count
    wordCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Technical term count
    technicalTermCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // AI enrichment (optional, additive only)
    aiFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional AI-generated qualitative feedback',
    },
    // Time spent writing (in seconds)
    timeSpent: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // User rating of the explanation (self-assessment)
    selfRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    // Whether this is the "best" version for this concept
    isBestVersion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'conceptId'],
      },
      {
        fields: ['userId', 'createdAt'],
      },
      {
        fields: ['conceptId', 'version'],
      },
      {
        fields: ['userId', 'isBestVersion'],
      },
    ],
    hooks: {
      afterSave: async (attempt) => {
        // If this is the best version, clear previous best
        if (attempt.isBestVersion) {
          await ExplainBackAttempt.update(
            { isBestVersion: false },
            {
              where: {
                userId: attempt.userId,
                conceptId: attempt.conceptId,
                id: { [sequelize.Op.ne]: attempt.id },
              },
            }
          );
        }
      },
    },
  }
);

module.exports = ExplainBackAttempt;