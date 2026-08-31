const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createE2EERoom, getE2EERoomInfo } = require('../controllers/e2eeChatController');

router.post('/create-vault', protect, createE2EERoom);
router.get('/room-info/:roomId', protect, getE2EERoomInfo);

module.exports = router;
