const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Topic = sequelize.define(
  'Topic',
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a topic name' },
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Weak', 'Medium', 'Strong'),
      defaultValue: 'Medium',
    },
    weightage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
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
        name: 'topic_subject_idx',
        fields: ['subject'],
      },
      {
        name: 'topic_user_idx',
        fields: ['user'],
      },
    ],
  }
);

module.exports = Topic;
