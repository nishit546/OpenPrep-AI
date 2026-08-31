const { Op } = require('sequelize');
const StudyPlaylist = require('../models/StudyPlaylist');
const StudyPlaylistItem = require('../models/StudyPlaylistItem');

// ── Constants ────────────────────────────────────────────────────────────

/** Supported sort strategies for playlist items. */
const SORT_STRATEGIES = {
  manual: 'manual',
  newest: 'newest',
  oldest: 'oldest',
  difficulty_desc: 'difficulty_desc',
  difficulty_asc: 'difficulty_asc',
};

/** How many public playlists to return in discovery queries. */
const DISCOVERY_LIMIT = 20;

// ── Playlist CRUD ────────────────────────────────────────────────────────

/**
 * Create a new study playlist.
 */
async function createPlaylist(userId, data) {
  const { title, description, subjectId, subjectName, mode, tags, color, icon, isPublic } = data;

  if (!title || !title.trim()) {
    throw new Error('Playlist title is required');
  }

  // Determine sort order (place at end)
  const maxOrder = await StudyPlaylist.max('sortOrder', {
    where: { user: userId },
  }).catch(() => 0);

  const playlist = await StudyPlaylist.create({
    user: userId,
    title: title.trim(),
    description: description || null,
    subjectId: subjectId || null,
    subjectName: subjectName || null,
    status: 'draft',
    sortOrder: (maxOrder || 0) + 1,
    mode: mode || 'sequential',
    tags: tags || [],
    color: color || '#6366f1',
    icon: icon || '📋',
    isPublic: isPublic || false,
  });

  return playlist;
}

/**
 * Get all playlists for a user with optional filtering.
 */
async function getPlaylists(userId, { status, subjectId, mode, page = 1, limit = 20 } = {}) {
  const where = { user: userId };
  if (status) where.status = status;
  if (subjectId) where.subjectId = subjectId;
  if (mode) where.mode = mode;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows } = await StudyPlaylist.findAndCountAll({
    where,
    order: [['sortOrder', 'ASC']],
    offset,
    limit,
  });

  return {
    playlists: rows,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

/**
 * Get a single playlist with its items.
 */
async function getPlaylistById(userId, playlistId) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  const items = await StudyPlaylistItem.findAll({
    where: { playlistId },
    order: [['position', 'ASC']],
  });

  const json = playlist.toJSON();
  json.items = items;
  return json;
}

/**
 * Update a playlist's metadata.
 */
async function updatePlaylist(userId, playlistId, updates) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  const allowedFields = [
    'title', 'description', 'subjectId', 'subjectName', 'status',
    'sortOrder', 'mode', 'tags', 'color', 'icon', 'isPublic',
    'spacedRepetitionEnabled', 'spacedIntervalDays',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      playlist[field] = updates[field];
    }
  }

  // Auto-set startedAt when moving to active
  if (updates.status === 'active' && !playlist.startedAt) {
    playlist.startedAt = new Date();
  }

  // Auto-set completedAt
  if (updates.status === 'completed') {
    playlist.completedAt = new Date();
  }

  await playlist.save();
  return playlist;
}

/**
 * Delete a playlist and all its items.
 */
async function deletePlaylist(userId, playlistId) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  await StudyPlaylistItem.destroy({ where: { playlistId } });
  await playlist.destroy();
  return true;
}

/**
 * Duplicate a playlist with all its items.
 */
async function duplicatePlaylist(userId, playlistId, newTitle) {
  const original = await getPlaylistById(userId, playlistId);
  if (!original) return null;

  const newPlaylist = await createPlaylist(userId, {
    title: newTitle || `${original.title} (Copy)`,
    description: original.description,
    subjectId: original.subjectId,
    subjectName: original.subjectName,
    mode: original.mode,
    tags: [...(original.tags || [])],
    color: original.color,
    icon: original.icon,
  });

  // Copy all items
  if (original.items && original.items.length > 0) {
    const itemData = original.items.map((item) => ({
      playlistId: newPlaylist.id,
      user: userId,
      itemType: item.itemType,
      referenceId: item.referenceId,
      title: item.title,
      description: item.description,
      position: item.position,
      status: 'pending',
      estimatedMinutes: item.estimatedMinutes,
      actualMinutes: 0,
      color: item.color,
      icon: item.icon,
      metadata: item.metadata || {},
    }));

    await StudyPlaylistItem.bulkCreate(itemData);
    newPlaylist.itemCount = itemData.length;
    newPlaylist.estimatedTotalMinutes = itemData.reduce(
      (sum, i) => sum + (i.estimatedMinutes || 0), 0,
    );
    await newPlaylist.save();
  }

  return getPlaylistById(userId, newPlaylist.id);
}

// ── Item Management ──────────────────────────────────────────────────────

/**
 * Add an item to a playlist.
 */
async function addItem(userId, playlistId, data) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  const { itemType, referenceId, title, description, estimatedMinutes, color, icon, metadata } = data;

  if (!itemType || !title) {
    throw new Error('itemType and title are required');
  }

  // Determine position (append at end)
  const maxPos = await StudyPlaylistItem.max('position', {
    where: { playlistId },
  }).catch(() => 0);

  const item = await StudyPlaylistItem.create({
    playlistId,
    user: userId,
    itemType,
    referenceId: referenceId || null,
    title,
    description: description || null,
    position: (maxPos || 0) + 1,
    estimatedMinutes: estimatedMinutes || 15,
    color: color || null,
    icon: icon || null,
    metadata: metadata || {},
  });

  // Update playlist counters
  playlist.itemCount += 1;
  playlist.estimatedTotalMinutes += estimatedMinutes || 15;
  await playlist.save();

  return item;
}

/**
 * Bulk-add items to a playlist.
 */
async function addBulkItems(userId, playlistId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items must be a non-empty array');
  }

  if (items.length > 50) {
    throw new Error('Maximum 50 items per bulk request');
  }

  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  const maxPos = await StudyPlaylistItem.max('position', {
    where: { playlistId },
  }).catch(() => 0);

  let position = (maxPos || 0) + 1;
  let totalEst = 0;

  const created = await StudyPlaylistItem.bulkCreate(
    items.map((d) => {
      totalEst += d.estimatedMinutes || 15;
      return {
        playlistId,
        user: userId,
        itemType: d.itemType,
        referenceId: d.referenceId || null,
        title: d.title,
        description: d.description || null,
        position: position++,
        estimatedMinutes: d.estimatedMinutes || 15,
        color: d.color || null,
        icon: d.icon || null,
        metadata: d.metadata || {},
      };
    }),
  );

  playlist.itemCount += created.length;
  playlist.estimatedTotalMinutes += totalEst;
  await playlist.save();

  return created;
}

/**
 * Remove an item from a playlist and re-index positions.
 */
async function removeItem(userId, playlistId, itemId) {
  const item = await StudyPlaylistItem.findOne({
    where: { id: itemId, playlistId, user: userId },
  });

  if (!item) return null;

  const removedPosition = item.position;
  await item.destroy();

  // Re-index remaining items
  const remaining = await StudyPlaylistItem.findAll({
    where: { playlistId, position: { [Op.gt]: removedPosition } },
    order: [['position', 'ASC']],
  });

  for (const r of remaining) {
    r.position -= 1;
    await r.save();
  }

  // Update playlist counters
  const playlist = await StudyPlaylist.findByPk(playlistId);
  if (playlist) {
    playlist.itemCount = Math.max(0, playlist.itemCount - 1);
    playlist.estimatedTotalMinutes = Math.max(
      0,
      playlist.estimatedTotalMinutes - (item.estimatedMinutes || 0),
    );
    if (item.status === 'completed') {
      playlist.completedCount = Math.max(0, playlist.completedCount - 1);
    }
    playlist.progressPercent = playlist.itemCount > 0
      ? Math.round((playlist.completedCount / playlist.itemCount) * 100)
      : 0;
    await playlist.save();
  }

  return true;
}

/**
 * Reorder items within a playlist.
 */
async function reorderItems(userId, playlistId, orderedIds) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('orderedIds must be a non-empty array');
  }

  // Verify all items belong to this playlist
  const items = await StudyPlaylistItem.findAll({
    where: { playlistId, id: { [Op.in]: orderedIds } },
  });

  if (items.length !== orderedIds.length) {
    throw new Error('Some item IDs do not belong to this playlist');
  }

  const itemMap = new Map(items.map((i) => [i.id, i]));

  for (let idx = 0; idx < orderedIds.length; idx++) {
    const item = itemMap.get(orderedIds[idx]);
    item.position = idx + 1;
    await item.save();
  }

  return StudyPlaylistItem.findAll({
    where: { playlistId },
    order: [['position', 'ASC']],
  });
}

/**
 * Update a single item's status, ratings, or notes.
 */
async function updateItem(userId, playlistId, itemId, updates) {
  const item = await StudyPlaylistItem.findOne({
    where: { id: itemId, playlistId, user: userId },
  });

  if (!item) return null;

  const allowedFields = [
    'status', 'estimatedMinutes', 'actualMinutes', 'difficultyRating',
    'confidenceRating', 'notes', 'nextReviewDate', 'color', 'icon',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      item[field] = updates[field];
    }
  }

  // Auto-timestamp status transitions
  if (updates.status === 'in_progress' && !item.startedAt) {
    item.startedAt = new Date();
  }
  if (updates.status === 'completed') {
    item.completedAt = new Date();
    if (!item.actualMinutes && item.startedAt) {
      const elapsed = (Date.now() - item.startedAt.getTime()) / 60000;
      item.actualMinutes = Math.round(elapsed * 10) / 10;
    }
  }

  await item.save();

  // Recalculate playlist progress
  await recalculatePlaylistProgress(playlistId);

  return item;
}

/**
 * Get the next recommended item in a playlist based on mode.
 */
async function getNextItem(userId, playlistId) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  const today = new Date().toISOString().split('T')[0];
  let items;

  switch (playlist.mode) {
    case 'spaced':
      // Return items due for review or pending items
      items = await StudyPlaylistItem.findAll({
        where: {
          playlistId,
          [Op.or]: [
            { status: 'pending' },
            { status: 'completed', nextReviewDate: { [Op.lte]: today } },
          ],
        },
        order: [['position', 'ASC']],
        limit: 1,
      });
      break;

    case 'random':
      items = await StudyPlaylistItem.findAll({
        where: { playlistId, status: { [Op.in]: ['pending', 'in_progress'] } },
      });
      if (items.length > 0) {
        const randomIdx = Math.floor(Math.random() * items.length);
        return items[randomIdx];
      }
      return null;

    case 'focus-weakest':
      // Prioritize items with lowest confidence ratings
      items = await StudyPlaylistItem.findAll({
        where: {
          playlistId,
          status: { [Op.in]: ['pending', 'in_progress'] },
        },
        order: [
          ['confidenceRating', 'ASC NULLS FIRST'],
          ['position', 'ASC'],
        ],
        limit: 1,
      });
      break;

    case 'sequential':
    default:
      items = await StudyPlaylistItem.findAll({
        where: { playlistId, status: { [Op.in]: ['pending', 'in_progress'] } },
        order: [['position', 'ASC']],
        limit: 1,
      });
      break;
  }

  return items && items.length > 0 ? items[0] : null;
}

// ── Analytics & Dashboard ────────────────────────────────────────────────

/**
 * Get analytics for a single playlist.
 */
async function getPlaylistAnalytics(userId, playlistId) {
  const playlist = await StudyPlaylist.findOne({
    where: { id: playlistId, user: userId },
  });

  if (!playlist) return null;

  const items = await StudyPlaylistItem.findAll({
    where: { playlistId },
    order: [['position', 'ASC']],
  });

  const statusCounts = { pending: 0, in_progress: 0, completed: 0, skipped: 0 };
  let totalActual = 0;
  let totalEstimated = 0;
  const typeBreakdown = {};

  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    totalActual += item.actualMinutes || 0;
    totalEstimated += item.estimatedMinutes || 0;

    if (!typeBreakdown[item.itemType]) {
      typeBreakdown[item.itemType] = { count: 0, completed: 0, avgDifficulty: 0, totalDifficulty: 0 };
    }
    typeBreakdown[item.itemType].count++;
    if (item.status === 'completed') {
      typeBreakdown[item.itemType].completed++;
    }
    if (item.difficultyRating) {
      typeBreakdown[item.itemType].totalDifficulty += item.difficultyRating;
    }
  }

  // Finalize averages
  for (const type of Object.keys(typeBreakdown)) {
    const tb = typeBreakdown[type];
    tb.avgDifficulty = tb.completed > 0
      ? Math.round((tb.totalDifficulty / tb.completed) * 10) / 10
      : 0;
    delete tb.totalDifficulty;
  }

  // Average difficulty and confidence ratings
  const completedItems = items.filter((i) => i.status === 'completed');
  const avgDifficulty = completedItems.length > 0
    ? Math.round(
      completedItems.reduce((s, i) => s + (i.difficultyRating || 0), 0)
      / completedItems.length * 10,
    ) / 10
    : 0;
  const avgConfidence = completedItems.length > 0
    ? Math.round(
      completedItems.reduce((s, i) => s + (i.confidenceRating || 0), 0)
      / completedItems.length * 10,
    ) / 10
    : 0;

  // Time efficiency
  const efficiency = totalEstimated > 0
    ? Math.round((totalActual / totalEstimated) * 100)
    : 0;

  return {
    playlistId: playlist.id,
    title: playlist.title,
    status: playlist.status,
    mode: playlist.mode,
    totalItems: items.length,
    statusCounts,
    progressPercent: playlist.progressPercent,
    estimatedTotalMinutes: totalEstimated,
    actualTotalMinutes: totalActual,
    timeEfficiency: efficiency,
    avgDifficultyRating: avgDifficulty,
    avgConfidenceRating: avgConfidence,
    typeBreakdown,
  };
}

/**
 * Get a global dashboard across all user playlists.
 */
async function getDashboard(userId) {
  const playlists = await StudyPlaylist.findAll({
    where: { user: userId },
    order: [['sortOrder', 'ASC']],
  });

  const statusCounts = { draft: 0, active: 0, paused: 0, completed: 0, archived: 0 };
  let totalItems = 0;
  let totalCompleted = 0;
  let totalMinutes = 0;

  for (const p of playlists) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    totalItems += p.itemCount || 0;
    totalCompleted += p.completedCount || 0;
    totalMinutes += p.actualTotalMinutes || 0;
  }

  const activePlaylists = playlists
    .filter((p) => p.status === 'active')
    .map((p) => ({
      id: p.id,
      title: p.title,
      progressPercent: p.progressPercent,
      itemCount: p.itemCount,
      completedCount: p.completedCount,
      icon: p.icon,
      color: p.color,
    }));

  // Recommended next items for active playlists
  const recommendations = [];
  for (const p of activePlaylists.slice(0, 5)) {
    const next = await getNextItem(userId, p.id);
    if (next) {
      recommendations.push({
        playlistId: p.id,
        playlistTitle: p.title,
        playlistIcon: p.icon,
        nextItem: {
          id: next.id,
          title: next.title,
          itemType: next.itemType,
          estimatedMinutes: next.estimatedMinutes,
        },
      });
    }
  }

  return {
    totalPlaylists: playlists.length,
    statusCounts,
    totalItems,
    totalCompleted,
    totalMinutesStudied: Math.round(totalMinutes),
    overallProgress: totalItems > 0
      ? Math.round((totalCompleted / totalItems) * 100)
      : 0,
    activePlaylists,
    recommendations,
  };
}

/**
 * Discover public playlists for a given subject.
 */
async function discoverPublicPlaylists({ subjectName, page = 1, limit = DISCOVERY_LIMIT } = {}) {
  const where = { isPublic: true, status: { [Op.ne]: 'draft' } };
  if (subjectName) where.subjectName = subjectName;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows } = await StudyPlaylist.findAndCountAll({
    where,
    order: [['rating', 'DESC'], ['forkCount', 'DESC']],
    offset,
    limit,
  });

  return {
    playlists: rows,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

/**
 * Fork a public playlist into a user's collection.
 */
async function forkPlaylist(userId, sourcePlaylistId) {
  const source = await StudyPlaylist.findByPk(sourcePlaylistId);
  if (!source || !source.isPublic) return null;

  // Increment fork count on source
  source.forkCount = (source.forkCount || 0) + 1;
  await source.save();

  const sourceItems = await StudyPlaylistItem.findAll({
    where: { playlistId: sourcePlaylistId },
    order: [['position', 'ASC']],
  });

  const newPlaylist = await createPlaylist(userId, {
    title: `${source.title} (Fork)`,
    description: source.description,
    subjectId: source.subjectId,
    subjectName: source.subjectName,
    mode: source.mode,
    tags: [...(source.tags || [])],
    color: source.color,
    icon: source.icon,
  });

  if (sourceItems.length > 0) {
    const itemData = sourceItems.map((item) => ({
      playlistId: newPlaylist.id,
      user: userId,
      itemType: item.itemType,
      referenceId: item.referenceId,
      title: item.title,
      description: item.description,
      position: item.position,
      status: 'pending',
      estimatedMinutes: item.estimatedMinutes,
      color: item.color,
      icon: item.icon,
      metadata: item.metadata || {},
    }));

    await StudyPlaylistItem.bulkCreate(itemData);
    newPlaylist.itemCount = itemData.length;
    newPlaylist.estimatedTotalMinutes = itemData.reduce(
      (sum, i) => sum + (i.estimatedMinutes || 0), 0,
    );
    await newPlaylist.save();
  }

  return getPlaylistById(userId, newPlaylist.id);
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Recalculate a playlist's progress counters from its items.
 */
async function recalculatePlaylistProgress(playlistId) {
  const playlist = await StudyPlaylist.findByPk(playlistId);
  if (!playlist) return;

  const items = await StudyPlaylistItem.findAll({ where: { playlistId } });

  let totalActual = 0;
  let totalEstimated = 0;
  let completedCount = 0;

  for (const item of items) {
    totalActual += item.actualMinutes || 0;
    totalEstimated += item.estimatedMinutes || 0;
    if (item.status === 'completed') completedCount++;
  }

  playlist.itemCount = items.length;
  playlist.completedCount = completedCount;
  playlist.estimatedTotalMinutes = totalEstimated;
  playlist.actualTotalMinutes = totalActual;
  playlist.progressPercent = items.length > 0
    ? Math.round((completedCount / items.length) * 100)
    : 0;

  // Auto-complete playlist if all items done
  if (items.length > 0 && completedCount === items.length && playlist.status === 'active') {
    playlist.status = 'completed';
    playlist.completedAt = new Date();
  }

  playlist.lastAccessedAt = new Date();
  await playlist.save();

  return playlist;
}

module.exports = {
  // Playlist CRUD
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  duplicatePlaylist,

  // Item Management
  addItem,
  addBulkItems,
  removeItem,
  reorderItems,
  updateItem,
  getNextItem,

  // Analytics & Dashboard
  getPlaylistAnalytics,
  getDashboard,
  discoverPublicPlaylists,
  forkPlaylist,

  // Helpers
  recalculatePlaylistProgress,
  SORT_STRATEGIES,
  DISCOVERY_LIMIT,
};
