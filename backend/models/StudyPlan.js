const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudyPlan = sequelize.define(
  'StudyPlan',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    exam: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    dailyGoals: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    milestones: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    overallStrategy: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'archived'),
      defaultValue: 'active',
    },
    currentVersionNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'studyplan_user_idx',
        fields: ['user'],
      },
      {
        name: 'studyplan_exam_idx',
        fields: ['exam'],
      },
      {
        name: 'studyplan_user_exam_idx',
        fields: ['user', 'exam'],
      },
      {
        name: 'studyplan_user_exam_created_idx',
        fields: ['user', 'exam', 'createdAt'],
      },
      {
        name: 'studyplan_dailygoals_idx',
        fields: ['dailyGoals'],
        using: 'GIN',
      },
    ],
  }
);

const cacheManager = require('../utils/cacheManager');
const { emitUserChanged } = require('../services/cacheInvalidationService');

StudyPlan.afterSave(async (studyPlan, options) => {
  emitUserChanged(studyPlan.user);
  try {
    const pattern = `user_${studyPlan.user}:*`;
    await cacheManager.invalidate(pattern);
    const cacheService = require('../services/cacheService');
    await cacheService.del(`study_plan:active:${studyPlan.user}`);
  } catch (err) {
    console.error('Error invalidating cache after StudyPlan save:', err);
  }
});

StudyPlan.afterDestroy(async (studyPlan, options) => {
  emitUserChanged(studyPlan.user);
  try {
    const pattern = `user_${studyPlan.user}:*`;
    await cacheManager.invalidate(pattern);
    const cacheService = require('../services/cacheService');
    await cacheService.del(`study_plan:active:${studyPlan.user}`);
  } catch (err) {
    console.error('Error invalidating cache after StudyPlan destroy:', err);
  }
});

module.exports = StudyPlan;
