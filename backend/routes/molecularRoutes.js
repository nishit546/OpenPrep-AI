const express = require('express');
const router = express.Router();
const {
  getStructures,
  getStructureById,
  explainStructure,
} = require('../controllers/molecularController');
const { protect } = require('../middleware/auth');

router.get('/structures', getStructures);
router.get('/structures/:id', getStructureById);
router.post('/explain', protect, explainStructure);

module.exports = router;
