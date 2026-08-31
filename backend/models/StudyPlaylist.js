const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyPlaylist — ordered collections of study activities that students
 * create to structure their learning flow.
 *
 * A playlist groups diverse item types (topics, flashcard decks, quizzes,
 * notes) into a sequential queue. Students can reorder items, track which
 * are done, and the service layer computes aggregate progress and time stats.
 */
const StudyPlaylist = sequelize.define(
  'StudyPlaylist',
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Playlist title is required' },
        len: { args: [1, 200], msg: 'Title must be between 1 and 200 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    subjectName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ── Status ──
    status: {
      type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'archived'),
      defaultValue: 'draft',
    },
    // ── Ordering & Metadata ──
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    itemCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    completedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    progressPercent: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    estimatedTotalMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    actualTotalMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    // ── Learning Mode ──
    mode: {
      type: DataTypes.ENUM('sequential', 'random', 'spaced', 'focus-weakest'),
      defaultValue: 'sequential',
      comment: 'How items should be presented to the student',
    },
    // ── Tags & Preferences ──
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#6366f1',
      comment: 'Hex color for UI display',
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: '📋',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Allow other students to fork this playlist',
    },
    forkCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 5 },
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // ── Completion Tracking ──
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ── Spaced Repetition Config ──
    spacedRepetitionEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    spacedIntervalDays: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Base interval in days for spaced mode',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'playlist_user_status_idx', fields: ['user', 'status'] },
      { name: 'playlist_user_sort_idx', fields: ['user', 'sortOrder'] },
      { name: 'playlist_subject_idx', fields: ['subjectId'] },
      { name: 'playlist_public_idx', fields: ['isPublic', 'rating'] },
    ],
  },
);

module.exports = StudyPlaylist;
