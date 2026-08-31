const studyPlaylistService = require('../services/studyPlaylistService');

// @desc    Create a new study playlist
// @route   POST /api/study-playlists
// @access  Private
exports.createPlaylist = async (req, res, next) => {
  try {
    const { title, description, subjectId, subjectName, mode, tags, color, icon, isPublic } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Playlist title is required' });
    }

    const playlist = await studyPlaylistService.createPlaylist(req.user.id, {
      title, description, subjectId, subjectName, mode, tags, color, icon, isPublic,
    });

    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all playlists for the authenticated user
// @route   GET /api/study-playlists
// @access  Private
exports.getPlaylists = async (req, res, next) => {
  try {
    const { status, subjectId, mode, page, limit } = req.query;
    const result = await studyPlaylistService.getPlaylists(req.user.id, {
      status, subjectId, mode,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true, count: result.playlists.length,
      ...result.pagination, data: result.playlists,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single playlist with items
// @route   GET /api/study-playlists/:id
// @access  Private
exports.getPlaylist = async (req, res, next) => {
  try {
    const playlist = await studyPlaylistService.getPlaylistById(req.user.id, req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a playlist
// @route   PUT /api/study-playlists/:id
// @access  Private
exports.updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await studyPlaylistService.updatePlaylist(req.user.id, req.params.id, req.body);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a playlist
// @route   DELETE /api/study-playlists/:id
// @access  Private
exports.deletePlaylist = async (req, res, next) => {
  try {
    const result = await studyPlaylistService.deletePlaylist(req.user.id, req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate a playlist
// @route   POST /api/study-playlists/:id/duplicate
// @access  Private
exports.duplicatePlaylist = async (req, res, next) => {
  try {
    const { title } = req.body;
    const playlist = await studyPlaylistService.duplicatePlaylist(
      req.user.id, req.params.id, title,
    );
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Add an item to a playlist
// @route   POST /api/study-playlists/:id/items
// @access  Private
exports.addItem = async (req, res, next) => {
  try {
    const { itemType, referenceId, title, description, estimatedMinutes, color, icon, metadata } = req.body;

    if (!itemType || !title) {
      return res.status(400).json({ success: false, error: 'itemType and title are required' });
    }

    const validTypes = ['topic', 'flashcard_deck', 'quiz', 'note', 'custom'];
    if (!validTypes.includes(itemType)) {
      return res.status(400).json({
        success: false, error: `itemType must be one of: ${validTypes.join(', ')}`,
      });
    }

    const item = await studyPlaylistService.addItem(req.user.id, req.params.id, {
      itemType, referenceId, title, description, estimatedMinutes, color, icon, metadata,
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk-add items to a playlist
// @route   POST /api/study-playlists/:id/items/bulk
// @access  Private
exports.addBulkItems = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items must be a non-empty array' });
    }
    if (items.length > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 items per bulk request' });
    }
    const result = await studyPlaylistService.addBulkItems(req.user.id, req.params.id, items);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(201).json({ success: true, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove an item from a playlist
// @route   DELETE /api/study-playlists/:id/items/:itemId
// @access  Private
exports.removeItem = async (req, res, next) => {
  try {
    const result = await studyPlaylistService.removeItem(
      req.user.id, req.params.id, req.params.itemId,
    );
    if (!result) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder items in a playlist
// @route   PUT /api/study-playlists/:id/reorder
// @access  Private
exports.reorderItems = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false, error: 'orderedIds must be a non-empty array of item IDs',
      });
    }
    const items = await studyPlaylistService.reorderItems(req.user.id, req.params.id, orderedIds);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    if (error.message.includes('do not belong')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Update a playlist item
// @route   PUT /api/study-playlists/:id/items/:itemId
// @access  Private
exports.updateItem = async (req, res, next) => {
  try {
    const item = await studyPlaylistService.updateItem(
      req.user.id, req.params.id, req.params.itemId, req.body,
    );
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the next recommended item
// @route   GET /api/study-playlists/:id/next
// @access  Private
exports.getNextItem = async (req, res, next) => {
  try {
    const item = await studyPlaylistService.getNextItem(req.user.id, req.params.id);
    if (!item) {
      return res.status(200).json({
        success: true, data: null, message: 'No pending items in this playlist',
      });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics for a playlist
// @route   GET /api/study-playlists/:id/analytics
// @access  Private
exports.getPlaylistAnalytics = async (req, res, next) => {
  try {
    const analytics = await studyPlaylistService.getPlaylistAnalytics(req.user.id, req.params.id);
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global dashboard
// @route   GET /api/study-playlists/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await studyPlaylistService.getDashboard(req.user.id);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Discover public playlists
// @route   GET /api/study-playlists/discover
// @access  Private
exports.discoverPublicPlaylists = async (req, res, next) => {
  try {
    const { subjectName, page, limit } = req.query;
    const result = await studyPlaylistService.discoverPublicPlaylists({
      subjectName,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    res.status(200).json({
      success: true, count: result.playlists.length,
      ...result.pagination, data: result.playlists,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fork a public playlist
// @route   POST /api/study-playlists/:id/fork
// @access  Private
exports.forkPlaylist = async (req, res, next) => {
  try {
    const playlist = await studyPlaylistService.forkPlaylist(req.user.id, req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found or not public' });
    }
    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};
