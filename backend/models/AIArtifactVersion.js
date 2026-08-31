const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AIArtifactVersion = sequelize.define(
  'AIArtifactVersion',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    artifactId: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
      comment: 'Reference to the generated artifact (quiz, study plan, etc.)',
    },
    artifactType: {
      type: DataTypes.ENUM('quiz', 'study-plan', 'flashcards', 'analysis'),
      allowNull: false,
    },
    contractId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'AIWorkflowContracts', key: 'id' },
    },
    contractVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    promptInput: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'The exact input passed to the AI model',
    },
    rawResponse: {
      type: DataTypes.LONGTEXT,
      allowNull: false,
      comment: 'Complete response from Gemini API',
    },
    parsedOutput: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Parsed and validated output',
    },
    validationStatus: {
      type: DataTypes.ENUM('valid', 'invalid', 'partially-valid', 'incompatible'),
      allowNull: false,
      defaultValue: 'valid',
    },
    validationErrors: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Schema validation errors if any',
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    indexes: [
      { fields: ['artifactId', 'contractVersion'] },
      { fields: ['contractId', 'validationStatus'] },
    ],
  }
);

module.exports = AIArtifactVersion;