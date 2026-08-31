const express = require('express');
const router = express.Router();
const {
  createPlan,
  calculateLivePacing,
  getAutopsy,
  getSubjectProfile,
} = require('../controllers/pacingCoachController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/plan', createPlan);
router.post('/live', calculateLivePacing);
router.post('/autopsy', getAutopsy);
router.get('/subjects/:subjectId', getSubjectProfile);

module.exports = router;
