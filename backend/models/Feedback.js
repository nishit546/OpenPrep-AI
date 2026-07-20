const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Feedback = sequelize.define(
  'Feedback',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.id;
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a title' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a description' },
      },
    },
    type: {
      type: DataTypes.ENUM('bug', 'feature_request'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'open',
        'under_review',
        'planned',
        'in_development',
        'completed',
        'closed'
      ),
      defaultValue: 'open',
    },
    upvotes: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'feedback_user_idx',
        fields: ['user'],
      },
    ],
  }
);

module.exports = Feedback;
