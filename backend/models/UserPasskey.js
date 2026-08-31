const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserPasskey = sequelize.define(
  'UserPasskey',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    credentialId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'credential_id',
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'public_key',
    },
    counter: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Passkey Device',
      field: 'device_name',
    },
    transports: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    aaguid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at',
    },
  },
  {
    tableName: 'user_passkeys',
    timestamps: true,
    underscored: true,
  }
);

module.exports = UserPasskey;
