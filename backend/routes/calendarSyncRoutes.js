const express = require('express');
const router = express.Router();
const {
  getSyncStatus,
  linkOutlook,
  getAppleICalFeed,
  handleOutlookWebhook,
  checkConflicts,
} = require('../controllers/calendarSyncController');
const { protect } = require('../middleware/auth');

router.get('/status', protect, getSyncStatus);
router.post('/outlook/link', protect, linkOutlook);
router.get('/ical-feed/:feedToken', getAppleICalFeed);
router.post('/outlook/webhook', handleOutlookWebhook);
router.post('/check-conflicts', protect, checkConflicts);

module.exports = router;
