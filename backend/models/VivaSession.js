const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const VivaSession = sequelize.define(
  'VivaSession',
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
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    turns: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    feedback: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    // Socratic engine state (see services/socraticVivaService.js)
    topic: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    depth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    // Text transcript only; no audio is ever stored.
    transcript: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    // Per-answer rubric scores: [{ conceptualAccuracy, depthOfExplanation, keywordRelevance, depth }]
    rubric: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['subjectId'],
      },
    ],
  }
);

module.exports = VivaSession;
