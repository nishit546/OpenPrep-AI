const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  reorderCollections,
  createBookmark,
  getBookmarks,
  getBookmark,
  updateBookmark,
  deleteBookmark,
  bulkCreateBookmarks,
  bulkDeleteBookmarks,
  moveToCollection,
  recordAccess,
  getUserTags,
  addTags,
  removeTags,
  getBookmarkAnalytics,
  getRecommendations,
} = require('../controllers/resourceBookmarkController');

const router = express.Router();

// ── Analytics & Insights (before param routes) ──────────────────────────
router.get('/analytics', protect, getBookmarkAnalytics);
router.get('/recommendations', protect, getRecommendations);
router.get('/tags/all', protect, getUserTags);

// ── Bulk & Move Operations ──────────────────────────────────────────────
router.post('/bulk', protect, bulkCreateBookmarks);
router.delete('/bulk', protect, bulkDeleteBookmarks);
router.put('/move-to-collection', protect, moveToCollection);
router.put('/tags/add', protect, addTags);
router.put('/tags/remove', protect, removeTags);

// ── Collections ─────────────────────────────────────────────────────────
router.post('/collections', protect, createCollection);
router.get('/collections', protect, getCollections);
router.get('/collections/:id', protect, getCollection);
router.put('/collections/:id', protect, updateCollection);
router.delete('/collections/:id', protect, deleteCollection);
router.put('/collections/reorder', protect, reorderCollections);

// ── Bookmarks CRUD ──────────────────────────────────────────────────────
router.post('/', protect, createBookmark);
router.get('/', protect, getBookmarks);
router.get('/:id', protect, getBookmark);
router.put('/:id', protect, updateBookmark);
router.delete('/:id', protect, deleteBookmark);
router.post('/:id/access', protect, recordAccess);

module.exports = router;
