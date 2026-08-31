const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * BookmarkCollection — a named folder that groups ResourceBookmarks together.
 * Students create collections like "Midterm Prep", "Weak Areas", or
 * "Must Revise Before Exam" to keep their bookmarks organised.
 */
const BookmarkCollection = sequelize.define(
  'BookmarkCollection',
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Collection name is required' },
        len: { args: [1, 150], msg: 'Name must be between 1 and 150 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalBookmarks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'bookmarkcollection_user_idx', fields: ['user'] },
      { name: 'bookmarkcollection_user_sort_idx', fields: ['user', 'sortOrder'] },
    ],
  }
);

module.exports = BookmarkCollection;
