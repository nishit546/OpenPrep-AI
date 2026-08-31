const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  archiveHabit,
  logHabit,
  useStreakFreeze,
  getStreakStatus,
  getAnalytics,
  getWeeklySummary,
  getRecommendations,
  getTodayStatus,
} = require('../controllers/habitTrackingController');

// All routes require authentication
router.use(protect);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/weekly-summary', getWeeklySummary);
router.get('/recommendations', getRecommendations);
router.get('/today', getTodayStatus);

// Habit CRUD
router.post('/', createHabit);
router.get('/', getHabits);
router.get('/:habitId', getHabit);
router.put('/:habitId', updateHabit);
router.delete('/:habitId', deleteHabit);
router.post('/:habitId/archive', archiveHabit);

// Streak management
router.post('/:habitId/log', logHabit);
router.post('/:habitId/freeze', useStreakFreeze);
router.get('/:habitId/streak', getStreakStatus);

module.exports = router;