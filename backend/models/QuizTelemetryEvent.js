const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Stores individual quiz interaction events (question views, option
// selections, flag toggles) submitted in batches by the client-side
// telemetry queue, instead of one row per live HTTP call.
const QuizTelemetryEvent = sequelize.define(
  'QuizTelemetryEvent',
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
    quiz: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    eventType: {
      type: DataTypes.ENUM('question_view', 'option_select', 'flag_toggle', 'quiz_submit', 'quiz_exit'),
      allowNull: false,
    },
    questionIndex: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    clientTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'quiz_telemetry_user_idx',
        fields: ['user'],
      },
      {
        name: 'quiz_telemetry_quiz_idx',
        fields: ['quiz'],
      },
    ],
  }
);

module.exports = QuizTelemetryEvent;