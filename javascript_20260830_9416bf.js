// Add these exports to your existing index.js
const StudyHabit = require('./StudyHabit');
const HabitLog = require('./HabitLog');
const HabitStreak = require('./HabitStreak');

// Define associations
StudyHabit.hasMany(HabitLog, {
  foreignKey: 'habitId',
  as: 'logs',
  onDelete: 'CASCADE',
});

StudyHabit.hasOne(HabitStreak, {
  foreignKey: 'habitId',
  as: 'streak',
  onDelete: 'CASCADE',
});

HabitLog.belongsTo(StudyHabit, {
  foreignKey: 'habitId',
  as: 'habit',
});

HabitStreak.belongsTo(StudyHabit, {
  foreignKey: 'habitId',
  as: 'habit',
});

// Export all models
module.exports = {
  // ... existing exports
  StudyHabit,
  HabitLog,
  HabitStreak,
};