const express = require('express');
const {
  getStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getQueueStatus,
} = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply protect and requireAdmin globally to all admin routes
router.use(protect);
router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/queues/status', getQueueStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
