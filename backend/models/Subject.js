const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Subject = sequelize.define(
  'Subject',
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a subject name' },
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    exam: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: 'subject_exam_idx',
        fields: ['exam'],
      },
      {
        name: 'subject_user_idx',
        fields: ['user'],
      },
    ],
  }
);

module.exports = Subject;
