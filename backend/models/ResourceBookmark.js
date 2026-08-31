const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * ResourceBookmark — lets students bookmark any study resource (note, quiz,
 * flashcard deck, PYQ, playlist) with personal notes, priority rating, and
 * custom tags for quick retrieval and organisation.
 */
const ResourceBookmark = sequelize.define(
  'ResourceBookmark',
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
    resourceType: {
      type: DataTypes.ENUM('note', 'quiz', 'flashcard_deck', 'pyq', 'playlist', 'study_plan', 'custom'),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Bookmark title is required' },
        len: { args: [1, 300], msg: 'Title must be between 1 and 300 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    collectionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 },
    },
    personalNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isFavourite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    accessCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'resbookmark_user_type_idx', fields: ['user', 'resourceType'] },
      { name: 'resbookmark_user_collection_idx', fields: ['user', 'collectionId'] },
      { name: 'resbookmark_resource_idx', fields: ['resourceType', 'resourceId'] },
      { name: 'resbookmark_user_fav_idx', fields: ['user', 'isFavourite'] },
      { name: 'resbookmark_user_priority_idx', fields: ['user', 'priority'] },
      { name: 'resbookmark_user_archived_idx', fields: ['user', 'isArchived'] },
    ],
  }
);

module.exports = ResourceBookmark;
