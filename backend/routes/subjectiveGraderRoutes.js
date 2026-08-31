const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { evaluateAnswer, generateRubric } = require('../controllers/subjectiveGraderController');

router.post('/evaluate', protect, evaluateAnswer);
router.post('/generate-rubric', protect, generateRubric);

module.exports = router;
