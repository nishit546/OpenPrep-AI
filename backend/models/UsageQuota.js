const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsageQuota = sequelize.define(
  'UsageQuota',
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    dailyCap: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'usagequota_user_date_idx',
        unique: true,
        fields: ['user', 'date'],
      },
      {
        name: 'usagequota_user_idx',
        fields: ['user'],
      },
    ],
  }
);

module.exports = UsageQuota;
