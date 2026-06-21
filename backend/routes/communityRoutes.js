const express = require('express');
const {
  submitFeedback,
  getFeedbackList,
  upvoteFeedback,
  getPublicRoadmap,
} = require('../controllers/communityController');
const { protect } = require('../middleware/auth');
const { validateSubmitFeedback } = require('../middleware/validators');

const router = express.Router();

router.post('/feedback', protect, validateSubmitFeedback, submitFeedback);
router.get('/feedback', protect, getFeedbackList);
router.put('/feedback/:id/upvote', protect, upvoteFeedback);
router.get('/roadmap', protect, getPublicRoadmap);

module.exports = router;
