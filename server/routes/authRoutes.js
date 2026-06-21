const express = require('express');
const { register, login, getMe, forgotPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);

module.exports = router;
