const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SquadAuditLog = sequelize.define('SquadAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  squadId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
    defaultValue: '127.0.0.1',
    field: 'ip_address',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  timestamps: true,
  updatedAt: false, // Audit logs are insert-only
  createdAt: 'created_at',
  tableName: 'squad_audit_logs',
});

module.exports = SquadAuditLog;
