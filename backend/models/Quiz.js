const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Quiz = sequelize.define(
  'Quiz',
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
        notEmpty: { msg: 'Please add a quiz title' },
      },
    },
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    topic: {
      type: DataTypes.UUID,
    },
    questions: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    type: {
      type: DataTypes.ENUM('AI_Generated', 'Manual'),
      defaultValue: 'AI_Generated',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'quiz_createdby_id_idx',
        unique: false,
        fields: ['createdBy', 'id'],
      },
      {
        name: 'quiz_subject_idx',
        fields: ['subject'],
      },
      {
        name: 'quiz_topic_idx',
        fields: ['topic'],
      },
    ],
  }
);

module.exports = Quiz;
