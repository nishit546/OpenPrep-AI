const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  useFreeze,
  getAnalytics,
  getHabitHistory,
  getWeeklySummary,
  getDashboard,
  getRecommendations,
} = require('../controllers/habitTrackerController');

const router = express.Router();

// ── Dashboard & Analytics ────────────────────────────────────────────────
router.get('/dashboard', protect, getDashboard);
router.get('/analytics', protect, getAnalytics);
router.get('/recommendations', protect, getRecommendations);
router.get('/summary/weekly', protect, getWeeklySummary);

// ── Habit CRUD ───────────────────────────────────────────────────────────
router.post('/', protect, createHabit);
router.get('/', protect, getHabits);
router.get('/:id', protect, getHabit);
router.put('/:id', protect, updateHabit);
router.delete('/:id', protect, deleteHabit);

// ── Logging & Streak ─────────────────────────────────────────────────────
router.post('/:id/log', protect, logHabit);
router.post('/:id/freeze', protect, useFreeze);
router.get('/:id/history', protect, getHabitHistory);

module.exports = router;
