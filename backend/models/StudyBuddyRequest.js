const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyBuddyRequest — manages study buddy matching between students.
 *
 * Each request represents a student looking for a study partner. The service
 * layer computes compatibility scores based on complementary subjects,
 * overlapping availability windows, and aligned study goals. Once matched,
 * both students can schedule joint study sessions and track shared progress.
 */
const StudyBuddyRequest = sequelize.define(
  'StudyBuddyRequest',
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
    // ── Match Preferences ──
    subjects: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of subject names the user wants help with',
    },
    strengths: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Subjects the user can tutor others in',
    },
    studyGoals: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Goals like "exam_prep", "concept_mastery", "quiz_practice"',
    },
    preferredStudyStyle: {
      type: DataTypes.ENUM('discuss', 'quiz_each_other', 'teach_back', 'silent_together', 'any'),
      defaultValue: 'any',
    },
    // ── Availability ──
    availabilityWindows: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { day: "monday", startHour: 14, endHour: 17 }',
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC',
    },
    maxSessionMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 120,
      validate: { min: 15, max: 480 },
    },
    // ── Status ──
    status: {
      type: DataTypes.ENUM('open', 'matched', 'paused', 'expired', 'cancelled'),
      defaultValue: 'open',
    },
    // ── Match Data (filled when matched) ──
    matchedWith: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User ID of the matched buddy',
    },
    matchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    compatibilityScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
      comment: 'Computed compatibility score 0-100',
    },
    matchReasons: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Human-readable reasons explaining the match',
    },
    // ── Session Tracking ──
    totalSessions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastSessionAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ── Feedback ──
    rating: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 1, max: 5 },
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ── Metadata ──
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Auto-expire open requests after this date',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'buddyreq_user_status_idx', fields: ['user', 'status'] },
      { name: 'buddyreq_status_expires_idx', fields: ['status', 'expiresAt'] },
      { name: 'buddyreq_matched_idx', fields: ['matchedWith'] },
    ],
  }
);

module.exports = StudyBuddyRequest;
