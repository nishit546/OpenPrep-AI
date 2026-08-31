const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BountyQuestion = sequelize.define(
  'BountyQuestion',
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
        notEmpty: { msg: 'Bounty title is required' },
      },
    },
    problemText: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Problem description text is required' },
      },
    },
    diagramUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bountyXp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Bounty XP must be at least 1' },
      },
    },
    expirationDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'SOLVED', 'EXPIRED'),
      defaultValue: 'OPEN',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = BountyQuestion;
