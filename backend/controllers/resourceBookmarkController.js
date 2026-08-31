const resourceBookmarkService = require('../services/resourceBookmarkService');
const ActivityLog = require('../models/ActivityLog');

// ── Collection Endpoints ─────────────────────────────────────────────────

// @desc    Create a bookmark collection
// @route   POST /api/bookmarks/collections
// @access  Private
exports.createCollection = async (req, res, next) => {
  try {
    const { name, description, icon, color, isPublic, metadata } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }
    const collection = await resourceBookmarkService.createCollection(req.user.id, {
      name, description, icon, color, isPublic, metadata,
    });
    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookmark collections
// @route   GET /api/bookmarks/collections
// @access  Private
exports.getCollections = async (req, res, next) => {
  try {
    const collections = await resourceBookmarkService.getUserCollections(req.user.id);
    res.status(200).json({ success: true, count: collections.length, data: collections });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single collection
// @route   GET /api/bookmarks/collections/:id
// @access  Private
exports.getCollection = async (req, res, next) => {
  try {
    const collection = await resourceBookmarkService.getCollectionById(req.user.id, req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a collection
// @route   PUT /api/bookmarks/collections/:id
// @access  Private
exports.updateCollection = async (req, res, next) => {
  try {
    const collection = await resourceBookmarkService.updateCollection(req.user.id, req.params.id, req.body);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a collection
// @route   DELETE /api/bookmarks/collections/:id
// @access  Private
exports.deleteCollection = async (req, res, next) => {
  try {
    const deleted = await resourceBookmarkService.deleteCollection(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder collections
// @route   PUT /api/bookmarks/collections/reorder
// @access  Private
exports.reorderCollections = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    const collections = await resourceBookmarkService.reorderCollections(req.user.id, orderedIds);
    res.status(200).json({ success: true, count: collections.length, data: collections });
  } catch (error) {
    next(error);
  }
};

// ── Bookmark Endpoints ───────────────────────────────────────────────────

// @desc    Create a bookmark
// @route   POST /api/bookmarks
// @access  Private
exports.createBookmark = async (req, res, next) => {
  try {
    const { resourceType, resourceId, title, description, collectionId, tags, priority, rating, personalNote, isFavourite, sourceUrl, metadata } = req.body;

    if (!resourceType || !title) {
      return res.status(400).json({ success: false, error: 'resourceType and title are required' });
    }

    const bookmark = await resourceBookmarkService.createBookmark(req.user.id, {
      resourceType, resourceId, title, description, collectionId, tags, priority, rating, personalNote, isFavourite, sourceUrl, metadata,
    });

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'bookmark_created',
      description: `Bookmarked ${resourceType}: "${title}"`,
    });

    res.status(201).json({ success: true, data: bookmark });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookmarks with filters
// @route   GET /api/bookmarks
// @access  Private
exports.getBookmarks = async (req, res, next) => {
  try {
    const { resourceType, collectionId, tags, priority, isFavourite, isArchived, search, rating, sortBy, page, limit } = req.query;

    const tagArray = tags ? (Array.isArray(tags) ? tags : tags.split(',')) : undefined;

    const result = await resourceBookmarkService.getUserBookmarks(req.user.id, {
      resourceType,
      collectionId,
      tags: tagArray,
      priority,
      isFavourite: isFavourite !== undefined ? isFavourite === 'true' : undefined,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
      search,
      rating,
      sortBy,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true,
      count: result.bookmarks.length,
      ...result.pagination,
      data: result.bookmarks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single bookmark
// @route   GET /api/bookmarks/:id
// @access  Private
exports.getBookmark = async (req, res, next) => {
  try {
    const bookmark = await resourceBookmarkService.getBookmarkById(req.user.id, req.params.id);
    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.status(200).json({ success: true, data: bookmark });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a bookmark
// @route   PUT /api/bookmarks/:id
// @access  Private
exports.updateBookmark = async (req, res, next) => {
  try {
    const bookmark = await resourceBookmarkService.updateBookmark(req.user.id, req.params.id, req.body);
    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.status(200).json({ success: true, data: bookmark });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a bookmark
// @route   DELETE /api/bookmarks/:id
// @access  Private
exports.deleteBookmark = async (req, res, next) => {
  try {
    const deleted = await resourceBookmarkService.deleteBookmark(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create bookmarks
// @route   POST /api/bookmarks/bulk
// @access  Private
exports.bulkCreateBookmarks = async (req, res, next) => {
  try {
    const { bookmarks } = req.body;
    const created = await resourceBookmarkService.bulkCreateBookmarks(req.user.id, bookmarks);
    res.status(201).json({ success: true, count: created.length, data: created });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete bookmarks
// @route   DELETE /api/bookmarks/bulk
// @access  Private
exports.bulkDeleteBookmarks = async (req, res, next) => {
  try {
    const { bookmarkIds } = req.body;
    const result = await resourceBookmarkService.bulkDeleteBookmarks(req.user.id, bookmarkIds);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Move bookmarks to a collection
// @route   PUT /api/bookmarks/move-to-collection
// @access  Private
exports.moveToCollection = async (req, res, next) => {
  try {
    const { bookmarkIds, collectionId } = req.body;
    const result = await resourceBookmarkService.moveToCollection(req.user.id, bookmarkIds, collectionId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Record access to a bookmark
// @route   POST /api/bookmarks/:id/access
// @access  Private
exports.recordAccess = async (req, res, next) => {
  try {
    const bookmark = await resourceBookmarkService.recordAccess(req.user.id, req.params.id);
    res.status(200).json({ success: true, data: bookmark });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// ── Tag Endpoints ────────────────────────────────────────────────────────

// @desc    Get all user tags
// @route   GET /api/bookmarks/tags/all
// @access  Private
exports.getUserTags = async (req, res, next) => {
  try {
    const tags = await resourceBookmarkService.getUserTags(req.user.id);
    res.status(200).json({ success: true, count: tags.length, data: tags });
  } catch (error) {
    next(error);
  }
};

// @desc    Add tags to bookmarks
// @route   PUT /api/bookmarks/tags/add
// @access  Private
exports.addTags = async (req, res, next) => {
  try {
    const { bookmarkIds, tags } = req.body;
    const updated = await resourceBookmarkService.addTagsToBookmarks(req.user.id, bookmarkIds, tags);
    res.status(200).json({ success: true, count: updated.length, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove tags from bookmarks
// @route   PUT /api/bookmarks/tags/remove
// @access  Private
exports.removeTags = async (req, res, next) => {
  try {
    const { bookmarkIds, tags } = req.body;
    const updated = await resourceBookmarkService.removeTagsFromBookmarks(req.user.id, bookmarkIds, tags);
    res.status(200).json({ success: true, count: updated.length, data: updated });
  } catch (error) {
    next(error);
  }
};

// ── Analytics & Insights ─────────────────────────────────────────────────

// @desc    Get bookmark analytics
// @route   GET /api/bookmarks/analytics
// @access  Private
exports.getBookmarkAnalytics = async (req, res, next) => {
  try {
    const analytics = await resourceBookmarkService.getBookmarkAnalytics(req.user.id);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get smart recommendations
// @route   GET /api/bookmarks/recommendations
// @access  Private
exports.getRecommendations = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await resourceBookmarkService.getRecommendations(req.user.id, {
      limit: parseInt(limit, 10) || 10,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
