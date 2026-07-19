const express = require('express');
const { generateAIPlan, getActivePlan, toggleTaskCompletion, getPlans } = require('../controllers/studyPlanController');
const { protect } = require('../middleware/auth');
const {
  validateGenerateAIPlan,
  validateToggleTask,
} = require('../middleware/validators');

const router = express.Router();

router.post('/generate-ai', protect, validateGenerateAIPlan, generateAIPlan);
router.get('/active', protect, getActivePlan);
router.get('/plans', protect, getPlans);
router.put('/:planId/tasks/:taskId', protect, validateToggleTask, toggleTaskCompletion);

module.exports = router;
