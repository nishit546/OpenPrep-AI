const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateMindMap,
  synthesizeQuizCards,
  recordNodeMastery,
  updateGraph,
  getMindMap,
} = require('../controllers/biDirectionalMindMapController');

router.post('/generate-bidirectional', protect, generateMindMap);
router.post('/synthesize-quiz-cards', protect, synthesizeQuizCards);
router.post('/:id/record-node-mastery', protect, recordNodeMastery);
router.put('/:id/update-graph', protect, updateGraph);
router.get('/:id', protect, getMindMap);

module.exports = router;
