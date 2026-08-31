const express = require('express');
const { protect } = require('../middleware/auth');
const {
  setBudget,
  getWeekBudgets,
  logStudyTime,
  getDashboard,
  getHistory,
  deleteBudget,
  cloneToNextWeek,
} = require('../controllers/studyTimeBudgetController');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/history', getHistory);
router.post('/log', logStudyTime);
router.post('/clone', cloneToNextWeek);
router.post('/', setBudget);
router.get('/', getWeekBudgets);
router.delete('/:id', deleteBudget);

module.exports = router;
