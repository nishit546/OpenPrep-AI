const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PYQ = sequelize.define(
  'PYQ',
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Please add a paper title' },
      },
    },
    exam: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    subject: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    analyzed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    analysisResults: {
      type: DataTypes.JSONB,
      defaultValue: {
        chapterWeightage: [],
        importantTopics: [],
        repeatedQuestions: [],
        trendAnalysis: '',
      },
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
        unique: false,
        fields: ['user', 'id'],
      },
    ],
  }
);

module.exports = PYQ;
