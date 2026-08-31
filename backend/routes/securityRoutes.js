/**
 * @fileoverview API routes for active session tracking, step-up OTP, and RBAC control checks.
 */
const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbacMiddleware');

/**
 * @route   GET /api/security/active-sessions
 * @desc    Fetch active device sessions list
 * @access  Private
 */
router.get('/security/active-sessions', protect, securityController.getActiveSessions);

/**
 * @route   DELETE /api/security/sessions/:family
 * @desc    Revoke specific device session family
 * @access  Private
 */
router.delete('/security/sessions/:family', protect, securityController.revokeSession);

/**
 * @route   POST /api/security/revoke-all
 * @desc    Revoke all other device sessions
 * @access  Private
 */
router.post('/security/revoke-all', protect, securityController.revokeAllOtherSessions);

/**
 * @route   POST /api/security/verify-otp
 * @desc    Submit step-up email OTP code to verify travel anomaly
 * @access  Public
 */
router.post('/security/verify-otp', securityController.verifyStepUpOtp);

/**
 * @route   GET /api/security/admin-only
 * @desc    Test endpoint restricted using hierarchical RBAC guard (Institution Admin required)
 * @access  Private (INSTITUTION_ADMIN)
 */
router.get('/security/admin-only', protect, requireRole('INSTITUTION_ADMIN'), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Institution Admin/Superadmin' });
});

module.exports = router;
