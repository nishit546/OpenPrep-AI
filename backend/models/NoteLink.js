const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const NoteLink = sequelize.define(
  'NoteLink',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sourceNoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Notes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    targetNoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Notes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'idx_notelink_source',
        fields: ['sourceNoteId'],
      },
      {
        name: 'idx_notelink_target',
        fields: ['targetNoteId'],
      },
      {
        name: 'idx_notelink_unique_pair',
        unique: true,
        fields: ['sourceNoteId', 'targetNoteId'],
      },
    ],
  }
);

module.exports = NoteLink;
