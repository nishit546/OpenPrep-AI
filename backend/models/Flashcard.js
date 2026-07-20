const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Flashcard = sequelize.define(
  'Flashcard',
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
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    topic: {
      type: DataTypes.UUID,
    },
    front: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a question or term for the front' },
      },
    },
    back: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add an answer or definition for the back' },
      },
    },
    interval: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    repetitions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    efactor: {
      type: DataTypes.FLOAT,
      defaultValue: 2.5,
    },
    nextReviewDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'flashcard_user_idx',
        fields: ['user'],
      },
      {
        name: 'flashcard_subject_idx',
        fields: ['subject'],
      },
      {
        name: 'flashcard_topic_idx',
        fields: ['topic'],
      },
      {
        name: 'flashcard_user_subject_idx',
        fields: ['user', 'subject'],
      },
    ],
  }
);

module.exports = Flashcard;
