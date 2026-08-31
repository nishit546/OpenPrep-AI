const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DocumentProcessingLog = sequelize.define(
  'DocumentProcessingLog',
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
    },
    stageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'DocumentProcessingStages', key: 'id' },
    },
    eventType: {
      type: DataTypes.ENUM('started', 'completed', 'failed', 'retried', 'skipped'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    indexes: [
      { fields: ['documentId', 'timestamp'] },
      { fields: ['stageId', 'eventType'] },
    ],
  }
);

module.exports = DocumentProcessingLog;