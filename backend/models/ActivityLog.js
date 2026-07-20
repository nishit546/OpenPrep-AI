const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ActivityLog = sequelize.define(
  'ActivityLog',
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
    activityType: {
      type: DataTypes.ENUM(
        'quiz_attempt',
        'pyq_upload',
        'flashcard_review',
        'study_plan_create',
        'note_upload'
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'activitylog_user_idx',
        fields: ['user'],
      },
      {
        name: 'activitylog_user_timestamp_idx',
        fields: ['user', 'timestamp'],
      },
    ],
  }
);

module.exports = ActivityLog;
