const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyPlaylistItem — individual entries inside a StudyPlaylist.
 *
 * Each item references a study resource (topic, flashcard deck, quiz, note,
 * or a free-form custom step) and carries its own ordering, status, and
 * time tracking. The service layer uses these to compute playlist-level
 * progress and recommend the next item.
 */
const StudyPlaylistItem = sequelize.define(
  'StudyPlaylistItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playlistId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // ── Item Type & Reference ──
    itemType: {
      type: DataTypes.ENUM('topic', 'flashcard_deck', 'quiz', 'note', 'custom'),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK to the referenced resource (topic, deck, quiz, note)',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Item title is required' } },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ── Ordering ──
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // ── Status ──
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
      defaultValue: 'pending',
    },
    // ── Time Tracking ──
    estimatedMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 15,
    },
    actualMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ── Self-Assessment ──
    difficultyRating: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 1, max: 5 },
      comment: 'Student self-rating after completion (1-5)',
    },
    confidenceRating: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 1, max: 5 },
      comment: 'Student confidence after completing this item',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Private notes the student adds while studying this item',
    },
    // ── Spaced Repetition ──
    nextReviewDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // ── Visual ──
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    icon: {
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
      { name: 'playlistitem_playlist_pos_idx', fields: ['playlistId', 'position'] },
      { name: 'playlistitem_user_status_idx', fields: ['user', 'status'] },
      { name: 'playlistitem_type_ref_idx', fields: ['itemType', 'referenceId'] },
      { name: 'playlistitem_review_idx', fields: ['nextReviewDate'] },
    ],
  },
);

module.exports = StudyPlaylistItem;
