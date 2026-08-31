const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MockExamSession = sequelize.define(
  'MockExamSession',
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
    examId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('started', 'submitted', 'expired'),
      defaultValue: 'started',
    },
    answers: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    violationsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    score: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'idx_mock_exam_user',
        fields: ['userId'],
      },
      {
        name: 'idx_mock_exam_exam',
        fields: ['examId'],
      },
    ],
  }
);

module.exports = MockExamSession;
