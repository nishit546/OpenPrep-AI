const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Note = sequelize.define(
  'Note',
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
        notEmpty: { msg: 'Please add a note title' },
      },
    },
    content: {
      type: DataTypes.TEXT,
    },
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    topic: {
      type: DataTypes.UUID,
    },
    fileUrl: {
      type: DataTypes.STRING,
    },
    fileType: {
      type: DataTypes.STRING,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    category: {
      type: DataTypes.ENUM('Lecture Notes', 'Study Guide', 'Cheat Sheet', 'Summary', 'Other'),
      defaultValue: 'Lecture Notes',
    },
    downloadsCount: {
      type: DataTypes.INTEGER,
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
        name: 'note_user_idx',
        fields: ['user'],
      },
      {
        name: 'note_subject_idx',
        fields: ['subject'],
      },
      {
        name: 'note_topic_idx',
        fields: ['topic'],
      },
      {
        name: 'note_user_subject_idx',
        fields: ['user', 'subject'],
      },
    ],
  }
);

module.exports = Note;
