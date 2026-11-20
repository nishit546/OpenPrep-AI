const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const controller = require('../controllers/adaptivePlannerController');

router.post('/generate', protect, controller.generateAdaptivePlan);
router.get('/adjustments/:planId?', protect, controller.getAdaptiveAdjustments);
router.post('/adjustments/:planId/apply', protect, controller.applyAdaptiveAdjustments);
router.get('/today', protect, controller.getTodayTasks);
router.get('/stats', protect, controller.getPlanStats);

module.exports = router;
