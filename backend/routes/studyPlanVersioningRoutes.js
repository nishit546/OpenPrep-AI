const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createVersion,
  getVersionHistory,
  getVersion,
  getLatestVersion,
  compareVersions,
  restoreVersion,
  getVersionSummary,
  deleteVersion,
} = require('../controllers/studyPlanVersioningController');

const router = express.Router({ mergeParams: true });

// ── Version Summary ──────────────────────────────────────────────────────
router.get('/versions/summary', protect, getVersionSummary);

// ── Compare ──────────────────────────────────────────────────────────────
router.get('/versions/compare', protect, compareVersions);

// ── Latest ───────────────────────────────────────────────────────────────
router.get('/versions/latest', protect, getLatestVersion);

// ── CRUD ─────────────────────────────────────────────────────────────────
router.post('/versions', protect, createVersion);
router.get('/versions', protect, getVersionHistory);
router.get('/versions/:versionNumber', protect, getVersion);
router.post('/versions/:versionNumber/restore', protect, restoreVersion);
router.delete('/versions/:versionId', protect, deleteVersion);

module.exports = router;
