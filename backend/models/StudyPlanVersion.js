const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * StudyPlanVersion — snapshots of study plan revisions.
 *
 * Every time a study plan is modified, a version record is created capturing
 * the full state at that point. Enables comparison between versions,
 * rollback, and revision history viewing.
 */
const StudyPlanVersion = sequelize.define(
  'StudyPlanVersion',
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
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    changeType: {
      type: DataTypes.ENUM('created', 'updated', 'task_added', 'task_removed', 'task_completed', 'schedule_changed', 'restored'),
      defaultValue: 'updated',
      allowNull: false,
    },
    changeDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Full plan state at this version',
    },
    diff: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'Changes from previous version: { added, removed, modified }',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 'studyplanversion_plan_idx', fields: ['planId', 'versionNumber'] },
      { name: 'studyplanversion_user_idx', fields: ['user', 'createdAt'] },
      { name: 'studyplanversion_plan_created_idx', fields: ['planId', 'createdAt'] },
    ],
  }
);

module.exports = StudyPlanVersion;
