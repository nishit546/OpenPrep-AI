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
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.id;
      },
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
    status: {
      type: DataTypes.ENUM('active', 'completed', 'archived'),
      defaultValue: 'active',
    },
  },
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
    ],
  }
);

module.exports = StudyPlan;
