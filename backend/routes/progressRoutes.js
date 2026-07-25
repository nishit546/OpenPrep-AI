const express = require('express');
const {
  getDashboardStats,
  getSubjectBreakdown,
  getStudyHours,
  trackStudyTime,
  updateTopicProgress,
  getActivityFeed,
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');
const {
  validateTrackStudyTime,
  validateUpdateTopicProgress,
} = require('../middleware/validators');

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/dashboard', protect, getDashboardStats);
router.get('/subjects', protect, getSubjectBreakdown);
router.get('/study-hours', protect, getStudyHours);
router.post('/track', protect, validateTrackStudyTime, trackStudyTime);
router.put('/topic/:id', protect, validateUpdateTopicProgress, updateTopicProgress);
router.get('/activity', protect, getActivityFeed);

module.exports = router;
