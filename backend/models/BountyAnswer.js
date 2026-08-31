const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BountyAnswer = sequelize.define(
  'BountyAnswer',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    answerText: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Answer text cannot be empty' },
      },
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    downvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isAccepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isFlagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    upvotedUserIds: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    downvotedUserIds: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    questionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = BountyAnswer;
