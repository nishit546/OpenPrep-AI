const express = require('express');
const router = express.Router();
const {
  getSummary,
  getTopics,
  getTrends
} = require('../controllers/confidenceCalibrationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summary', getSummary);
router.get('/topics', getTopics);
router.get('/trends', getTrends);

module.exports = router;
