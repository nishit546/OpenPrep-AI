const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CodeRoom = sequelize.define(
  'CodeRoom',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a room title' },
      },
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'javascript',
    },
    code: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    docState: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    inviteCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }
);

module.exports = CodeRoom;
