const express = require('express');
const { runCode, createRoom, getRoom } = require('../controllers/codeSandboxController');
const { protect } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/run', protect, rateLimiter, runCode);
router.post('/rooms', protect, createRoom);
router.get('/rooms/:inviteCode', protect, getRoom);

module.exports = router;
