const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createPlaylist,
  getPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  duplicatePlaylist,
  addItem,
  addBulkItems,
  removeItem,
  reorderItems,
  updateItem,
  getNextItem,
  getPlaylistAnalytics,
  getDashboard,
  discoverPublicPlaylists,
  forkPlaylist,
} = require('../controllers/studyPlaylistController');

const router = express.Router();

// ── Dashboard & Discovery (before param routes) ─────────────────────────
router.get('/dashboard', protect, getDashboard);
router.get('/discover', protect, discoverPublicPlaylists);

// ── Playlist CRUD ────────────────────────────────────────────────────────
router.post('/', protect, createPlaylist);
router.get('/', protect, getPlaylists);

// ── Bulk Operations ─────────────────────────────────────────────────────
router.post('/:id/items/bulk', protect, addBulkItems);

// ── Analytics & Next Item (before :itemId routes) ───────────────────────
router.get('/:id/analytics', protect, getPlaylistAnalytics);
router.get('/:id/next', protect, getNextItem);

// ── Single Playlist ─────────────────────────────────────────────────────
router.get('/:id', protect, getPlaylist);
router.put('/:id', protect, updatePlaylist);
router.delete('/:id', protect, deletePlaylist);

// ── Duplicate & Fork ────────────────────────────────────────────────────
router.post('/:id/duplicate', protect, duplicatePlaylist);
router.post('/:id/fork', protect, forkPlaylist);

// ── Reorder ─────────────────────────────────────────────────────────────
router.put('/:id/reorder', protect, reorderItems);

// ── Items ───────────────────────────────────────────────────────────────
router.post('/:id/items', protect, addItem);
router.put('/:id/items/:itemId', protect, updateItem);
router.delete('/:id/items/:itemId', protect, removeItem);

module.exports = router;
