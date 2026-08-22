const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    query: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    executionTime: {
      type: DataTypes.INTEGER, // in ms
      allowNull: false,
    },
    executionPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'AuditLogs',
  }
);

module.exports = AuditLog;
