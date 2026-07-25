const { sequelize } = require('../config/db');

// Import all models
const User = require('./User');
const Exam = require('./Exam');
const Subject = require('./Subject');
const Topic = require('./Topic');
const PYQ = require('./PYQ');
const StudyPlan = require('./StudyPlan');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Note = require('./Note');
const Flashcard = require('./Flashcard');
const Progress = require('./Progress');
const Feedback = require('./Feedback');
const ActivityLog = require('./ActivityLog');
const UsageQuota = require('./UsageQuota');

module.exports = {
  sequelize,
  User,
  Exam,
  Subject,
  Topic,
  PYQ,
  StudyPlan,
  Quiz,
  QuizAttempt,
  Note,
  Flashcard,
  Progress,
  Feedback,
  ActivityLog,
  UsageQuota,
};
