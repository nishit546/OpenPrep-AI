const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ConfidenceCalibrationLog = sequelize.define(
  'ConfidenceCalibrationLog',
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
    // Question context
    questionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Questions',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    topicId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Topics',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Subjects',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    // Quiz attempt context
    quizAttemptId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'QuizAttempts',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    // Confidence rating (0-100 scale)
    confidence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Confidence bucket (for 5-bucket scale)
    confidenceBucket: {
      type: DataTypes.ENUM('guess', 'unsure', 'neutral', 'confident', 'certain'),
      allowNull: true,
    },
    // Outcome: 1 = correct, 0 = incorrect
    outcome: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 1,
      },
    },
    // Time taken to answer (seconds)
    timeTaken: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    // Brier score for this individual prediction
    brierScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    // Calibration metrics at time of logging (snapshot)
    // These are computed from the user's history up to this point
    cumulativeAccuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    cumulativeConfidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    cumulativeBrier: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    // Session metadata
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // Device/context info
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Whether confidence was recorded (some questions may skip)
    confidenceRecorded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'createdAt'],
      },
      {
        fields: ['userId', 'topicId'],
      },
      {
        fields: ['userId', 'subjectId'],
      },
      {
        fields: ['userId', 'confidenceBucket'],
      },
      {
        fields: ['userId', 'quizAttemptId'],
      },
    ],
    hooks: {
      beforeCreate: async (log) => {
        // Automatically calculate Brier score
        const confidenceNormalized = log.confidence / 100;
        log.brierScore = Math.pow(confidenceNormalized - log.outcome, 2);
      },
      afterCreate: async (log) => {
        // Update user's cumulative metrics
        const ConfidenceCalibrationLog = sequelize.models.ConfidenceCalibrationLog;
        const logs = await ConfidenceCalibrationLog.findAll({
          where: {
            userId: log.userId,
          },
          attributes: ['confidence', 'outcome', 'brierScore'],
        });

        if (logs.length > 0) {
          const total = logs.length;
          const avgConfidence = logs.reduce((sum, l) => sum + l.confidence, 0) / total / 100;
          const accuracy = logs.reduce((sum, l) => sum + l.outcome, 0) / total;
          const avgBrier = logs.reduce((sum, l) => sum + l.brierScore, 0) / total;

          // Update the log with cumulative metrics (if needed for snapshots)
          // This is handled in the service layer
        }
      },
    },
  }
);

module.exports = ConfidenceCalibrationLog;