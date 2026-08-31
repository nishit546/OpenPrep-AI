const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const ResourceBookmark = require('../models/ResourceBookmark');
const BookmarkCollection = require('../models/BookmarkCollection');

// ── Errors ───────────────────────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

// ── Collection CRUD ──────────────────────────────────────────────────────

/**
 * Create a new bookmark collection.
 */
async function createCollection(userId, data) {
  const maxOrder = await BookmarkCollection.max('sortOrder', {
    where: { user: userId },
  });

  const collection = await BookmarkCollection.create({
    user: userId,
    name: data.name,
    description: data.description || null,
    icon: data.icon || null,
    color: data.color || null,
    isPublic: data.isPublic || false,
    sortOrder: maxOrder !== null ? maxOrder + 1 : 0,
    metadata: data.metadata || {},
  });

  return collection;
}

/**
 * Get all collections for a user.
 */
async function getUserCollections(userId) {
  const collections = await BookmarkCollection.findAll({
    where: { user: userId },
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });

  // Enrich with bookmark counts
  const enriched = [];
  for (const col of collections) {
    const count = await ResourceBookmark.count({
      where: { user: userId, collectionId: col.id, isArchived: false },
    });
    enriched.push({ ...col.toJSON(), bookmarkCount: count });
  }

  return enriched;
}

/**
 * Get a single collection by ID.
 */
async function getCollectionById(userId, collectionId) {
  const collection = await BookmarkCollection.findOne({
    where: { id: collectionId, user: userId },
  });
  return collection || null;
}

/**
 * Update a collection.
 */
async function updateCollection(userId, collectionId, updates) {
  const collection = await BookmarkCollection.findOne({
    where: { id: collectionId, user: userId },
  });
  if (!collection) return null;

  const allowedFields = ['name', 'description', 'icon', 'color', 'isPublic', 'sortOrder', 'metadata'];
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      collection[key] = updates[key];
    }
  }
  await collection.save();
  return collection;
}

/**
 * Delete a collection. Bookmarks inside are unlinked (not deleted).
 */
async function deleteCollection(userId, collectionId) {
  const collection = await BookmarkCollection.findOne({
    where: { id: collectionId, user: userId },
  });
  if (!collection) return null;

  // Unlink bookmarks from this collection
  await ResourceBookmark.update(
    { collectionId: null },
    { where: { user: userId, collectionId: collectionId } }
  );

  await collection.destroy();
  return true;
}

/**
 * Reorder collections.
 */
async function reorderCollections(userId, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('orderedIds must be a non-empty array');
  }

  const collections = await BookmarkCollection.findAll({
    where: { user: userId },
  });
  const colMap = new Map(collections.map((c) => [c.id, c]));

  for (let i = 0; i < orderedIds.length; i++) {
    const col = colMap.get(orderedIds[i]);
    if (col) {
      col.sortOrder = i;
      await col.save();
    }
  }

  return getUserCollections(userId);
}

// ── Bookmark CRUD ────────────────────────────────────────────────────────

/**
 * Create a new bookmark.
 */
async function createBookmark(userId, data) {
  const bookmark = await ResourceBookmark.create({
    user: userId,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    title: data.title,
    description: data.description || null,
    collectionId: data.collectionId || null,
    tags: data.tags || [],
    priority: data.priority || 'medium',
    rating: data.rating || null,
    personalNote: data.personalNote || null,
    isFavourite: data.isFavourite || false,
    sourceUrl: data.sourceUrl || null,
    metadata: data.metadata || {},
  });

  // Update collection totalBookmarks if assigned
  if (bookmark.collectionId) {
    await recalcCollectionCount(userId, bookmark.collectionId);
  }

  return bookmark;
}

/**
 * Get bookmarks for a user with filtering, search, and pagination.
 */
async function getUserBookmarks(userId, {
  resourceType,
  collectionId,
  tags,
  priority,
  isFavourite,
  isArchived,
  search,
  rating,
  sortBy,
  page = 1,
  limit = 20,
} = {}) {
  const where = { user: userId };
  if (resourceType) where.resourceType = resourceType;
  if (collectionId) where.collectionId = collectionId;
  if (priority) where.priority = priority;
  if (isFavourite !== undefined) where.isFavourite = isFavourite;
  if (isArchived !== undefined) where.isArchived = isArchived;
  if (rating) where.rating = { [Op.gte]: parseInt(rating, 10) };
  if (tags && tags.length > 0) {
    where.tags = { [Op.overlap]: Array.isArray(tags) ? tags : [tags] };
  }
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { personalNote: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const offset = (Math.max(1, page) - 1) * limit;

  let order;
  switch (sortBy) {
    case 'priority':
      order = [['priority', 'DESC'], ['createdAt', 'DESC']];
      break;
    case 'rating':
      order = [['rating', 'DESC'], ['createdAt', 'DESC']];
      break;
    case 'recent':
      order = [['lastAccessedAt', 'DESC']];
      break;
    case 'title':
      order = [['title', 'ASC']];
      break;
    case 'access':
      order = [['accessCount', 'DESC'], ['createdAt', 'DESC']];
      break;
    default:
      order = [['createdAt', 'DESC']];
  }

  const { count, rows: bookmarks } = await ResourceBookmark.findAndCountAll({
    where,
    order,
    offset,
    limit,
  });

  return {
    bookmarks,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

/**
 * Get a single bookmark by ID.
 */
async function getBookmarkById(userId, bookmarkId) {
  const bookmark = await ResourceBookmark.findOne({
    where: { id: bookmarkId, user: userId },
  });
  return bookmark || null;
}

/**
 * Update a bookmark.
 */
async function updateBookmark(userId, bookmarkId, updates) {
  const bookmark = await ResourceBookmark.findOne({
    where: { id: bookmarkId, user: userId },
  });
  if (!bookmark) return null;

  const oldCollectionId = bookmark.collectionId;

  const allowedFields = [
    'title', 'description', 'collectionId', 'tags', 'priority',
    'rating', 'personalNote', 'isFavourite', 'isArchived', 'sourceUrl', 'metadata',
  ];
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      bookmark[key] = updates[key];
    }
  }
  await bookmark.save();

  // Recalc counts if collection changed
  if (bookmark.collectionId !== oldCollectionId) {
    if (oldCollectionId) await recalcCollectionCount(userId, oldCollectionId);
    if (bookmark.collectionId) await recalcCollectionCount(userId, bookmark.collectionId);
  }

  return bookmark;
}

/**
 * Delete a bookmark.
 */
async function deleteBookmark(userId, bookmarkId) {
  const bookmark = await ResourceBookmark.findOne({
    where: { id: bookmarkId, user: userId },
  });
  if (!bookmark) return null;

  const collectionId = bookmark.collectionId;
  await bookmark.destroy();

  if (collectionId) {
    await recalcCollectionCount(userId, collectionId);
  }

  return true;
}

/**
 * Bulk create bookmarks.
 */
async function bulkCreateBookmarks(userId, bookmarksData) {
  if (!Array.isArray(bookmarksData) || bookmarksData.length === 0) {
    throw new Error('bookmarksData must be a non-empty array');
  }
  if (bookmarksData.length > 50) {
    throw new Error('Maximum 50 bookmarks per bulk request');
  }

  const created = [];
  for (const data of bookmarksData) {
    const bookmark = await createBookmark(userId, data);
    created.push(bookmark);
  }
  return created;
}

/**
 * Bulk delete bookmarks.
 */
async function bulkDeleteBookmarks(userId, bookmarkIds) {
  if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
    throw new Error('bookmarkIds must be a non-empty array');
  }

  const result = await ResourceBookmark.destroy({
    where: { id: { [Op.in]: bookmarkIds }, user: userId },
  });

  return { deletedCount: result };
}

/**
 * Move bookmarks to a collection.
 */
async function moveToCollection(userId, bookmarkIds, collectionId) {
  if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
    throw new Error('bookmarkIds must be a non-empty array');
  }

  // Validate collection exists if provided
  if (collectionId) {
    const collection = await BookmarkCollection.findOne({
      where: { id: collectionId, user: userId },
    });
    if (!collection) throw new NotFoundError('Collection not found');
  }

  // Get affected collections before update
  const affectedBookmarks = await ResourceBookmark.findAll({
    where: { id: { [Op.in]: bookmarkIds }, user: userId },
  });
  const affectedCollections = new Set(affectedBookmarks.map((b) => b.collectionId).filter(Boolean));
  if (collectionId) affectedCollections.add(collectionId);

  const [updatedCount] = await ResourceBookmark.update(
    { collectionId },
    { where: { id: { [Op.in]: bookmarkIds }, user: userId } }
  );

  // Recalc counts for affected collections
  for (const colId of affectedCollections) {
    await recalcCollectionCount(userId, colId);
  }

  return { updatedCount };
}

// ── Tag Management ───────────────────────────────────────────────────────

/**
 * Get all unique tags used by a user across their bookmarks.
 */
async function getUserTags(userId) {
  const bookmarks = await ResourceBookmark.findAll({
    where: { user: userId },
    attributes: ['tags'],
  });

  const tagCounts = {};
  for (const bookmark of bookmarks) {
    const tags = bookmark.tags || [];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Add tags to multiple bookmarks.
 */
async function addTagsToBookmarks(userId, bookmarkIds, newTags) {
  if (!Array.isArray(newTags) || newTags.length === 0) {
    throw new Error('newTags must be a non-empty array');
  }

  const bookmarks = await ResourceBookmark.findAll({
    where: { id: { [Op.in]: bookmarkIds }, user: userId },
  });

  const updated = [];
  for (const bookmark of bookmarks) {
    const existingTags = new Set(bookmark.tags || []);
    for (const tag of newTags) {
      existingTags.add(tag);
    }
    bookmark.tags = Array.from(existingTags);
    await bookmark.save();
    updated.push(bookmark);
  }

  return updated;
}

/**
 * Remove tags from multiple bookmarks.
 */
async function removeTagsFromBookmarks(userId, bookmarkIds, tagsToRemove) {
  if (!Array.isArray(tagsToRemove) || tagsToRemove.length === 0) {
    throw new Error('tagsToRemove must be a non-empty array');
  }

  const bookmarks = await ResourceBookmark.findAll({
    where: { id: { [Op.in]: bookmarkIds }, user: userId },
  });

  const removeSet = new Set(tagsToRemove);
  const updated = [];
  for (const bookmark of bookmarks) {
    bookmark.tags = (bookmark.tags || []).filter((t) => !removeSet.has(t));
    await bookmark.save();
    updated.push(bookmark);
  }

  return updated;
}

// ── Access Tracking ──────────────────────────────────────────────────────

/**
 * Record that a bookmark was accessed (increments count).
 */
async function recordAccess(userId, bookmarkId) {
  const bookmark = await ResourceBookmark.findOne({
    where: { id: bookmarkId, user: userId },
  });
  if (!bookmark) throw new NotFoundError('Bookmark not found');

  bookmark.accessCount = (bookmark.accessCount || 0) + 1;
  bookmark.lastAccessedAt = new Date();
  await bookmark.save();
  return bookmark;
}

// ── Analytics & Insights ─────────────────────────────────────────────────

/**
 * Get comprehensive bookmark analytics for a user.
 */
async function getBookmarkAnalytics(userId) {
  const bookmarks = await ResourceBookmark.findAll({
    where: { user: userId },
  });

  const collections = await BookmarkCollection.findAll({
    where: { user: userId },
  });

  const totalBookmarks = bookmarks.length;
  const favourites = bookmarks.filter((b) => b.isFavourite).length;
  const archived = bookmarks.filter((b) => b.isArchived).length;
  const active = totalBookmarks - archived;

  // Resource type distribution
  const resourceTypeDistribution = {};
  for (const b of bookmarks) {
    const type = b.resourceType;
    if (!resourceTypeDistribution[type]) {
      resourceTypeDistribution[type] = { total: 0, favourites: 0, avgRating: 0, ratings: [] };
    }
    resourceTypeDistribution[type].total++;
    if (b.isFavourite) resourceTypeDistribution[type].favourites++;
    if (b.rating) resourceTypeDistribution[type].ratings.push(b.rating);
  }
  for (const type of Object.keys(resourceTypeDistribution)) {
    const ratings = resourceTypeDistribution[type].ratings;
    resourceTypeDistribution[type].avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, c) => a + c, 0) / ratings.length) * 100) / 100
      : 0;
    delete resourceTypeDistribution[type].ratings;
  }

  // Priority distribution
  const priorityDistribution = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const b of bookmarks) {
    if (priorityDistribution[b.priority] !== undefined) {
      priorityDistribution[b.priority]++;
    }
  }

  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRatingSum = 0;
  let ratedCount = 0;
  for (const b of bookmarks) {
    if (b.rating) {
      ratingDistribution[b.rating]++;
      totalRatingSum += b.rating;
      ratedCount++;
    }
  }
  const averageRating = ratedCount > 0 ? Math.round((totalRatingSum / ratedCount) * 100) / 100 : 0;

  // Top tags
  const tagCounts = {};
  for (const b of bookmarks) {
    for (const tag of (b.tags || [])) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Most accessed
  const mostAccessed = bookmarks
    .filter((b) => b.accessCount > 0)
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      title: b.title,
      resourceType: b.resourceType,
      accessCount: b.accessCount,
      lastAccessedAt: b.lastAccessedAt,
    }));

  // Recently added
  const recentlyAdded = bookmarks
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      title: b.title,
      resourceType: b.resourceType,
      createdAt: b.createdAt,
    }));

  // Collection summary
  const collectionSummary = collections.map((c) => ({
    id: c.id,
    name: c.name,
    totalBookmarks: c.totalBookmarks || 0,
  }));

  // Bookmarks without a collection
  const uncategorizedCount = bookmarks.filter((b) => !b.collectionId && !b.isArchived).length;

  return {
    summary: {
      totalBookmarks,
      active,
      favourites,
      archived,
      uncategorized: uncategorizedCount,
      totalCollections: collections.length,
      averageRating,
      totalRated: ratedCount,
    },
    resourceTypeDistribution,
    priorityDistribution,
    ratingDistribution,
    topTags,
    mostAccessed,
    recentlyAdded,
    collectionSummary,
  };
}

/**
 * Get smart recommendations based on bookmark patterns.
 */
async function getRecommendations(userId, { limit = 10 } = {}) {
  const bookmarks = await ResourceBookmark.findAll({
    where: { user: userId },
    order: [['createdAt', 'DESC']],
    limit: 200,
  });

  if (bookmarks.length === 0) return { recommendations: [], insights: [] };

  const insights = [];

  // Find most-bookmarked resource types (user preference signal)
  const typeCounts = {};
  for (const b of bookmarks) {
    typeCounts[b.resourceType] = (typeCounts[b.resourceType] || 0) + 1;
  }
  const preferredType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  if (preferredType) {
    insights.push(
      `You have ${preferredType[1]} bookmarks of type "${preferredType[0]}" — this is your most-bookmarked resource type.`
    );
  }

  // Find under-rated bookmarks (bookmarked but not rated)
  const unrated = bookmarks.filter((b) => !b.rating && !b.isArchived);
  if (unrated.length > 0) {
    insights.push(
      `${unrated.length} bookmarks are unrated. Adding ratings helps surface your best resources.`
    );
  }

  // Find rarely accessed bookmarks
  const rarelyAccessed = bookmarks.filter(
    (b) => b.accessCount <= 1 && !b.isArchived && b.accessCount > 0
  );
  if (rarelyAccessed.length > 3) {
    insights.push(
      `${rarelyAccessed.length} bookmarks have only been accessed once — consider archiving unused ones.`
    );
  }

  // Suggest review: high-priority bookmarks not accessed recently
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const staleHighPriority = bookmarks
    .filter((b) => {
      const priority = ['high', 'urgent'].includes(b.priority);
      const lastAccess = b.lastAccessedAt ? new Date(b.lastAccessedAt) < twoWeeksAgo : true;
      return priority && lastAccess && !b.isArchived;
    })
    .slice(0, limit)
    .map((b) => ({
      id: b.id,
      title: b.title,
      resourceType: b.resourceType,
      resourceId: b.resourceId,
      priority: b.priority,
      lastAccessedAt: b.lastAccessedAt,
      reason: `High-priority bookmark not accessed recently`,
    }));

  // Suggest favourites that haven't been accessed
  const unaccessedFavourites = bookmarks
    .filter((b) => b.isFavourite && !b.lastAccessedAt && !b.isArchived)
    .slice(0, limit)
    .map((b) => ({
      id: b.id,
      title: b.title,
      resourceType: b.resourceType,
      resourceId: b.resourceId,
      priority: b.priority,
      reason: `Favourited but never accessed`,
    }));

  const recommendations = [...staleHighPriority, ...unaccessedFavourites].slice(0, limit);

  // Tag-based suggestion
  const tagCounts = {};
  for (const b of bookmarks) {
    for (const tag of (b.tags || [])) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const popularTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (popularTags.length > 0) {
    insights.push(
      `Your most-used tags are: ${popularTags.map(([t, c]) => `"${t}" (${c})`).join(', ')}.`
    );
  }

  return { recommendations, insights };
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function recalcCollectionCount(userId, collectionId) {
  const count = await ResourceBookmark.count({
    where: { user: userId, collectionId, isArchived: false },
  });
  await BookmarkCollection.update(
    { totalBookmarks: count },
    { where: { id: collectionId, user: userId } }
  );
}

module.exports = {
  // Collections
  createCollection,
  getUserCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  reorderCollections,
  // Bookmarks
  createBookmark,
  getUserBookmarks,
  getBookmarkById,
  updateBookmark,
  deleteBookmark,
  bulkCreateBookmarks,
  bulkDeleteBookmarks,
  moveToCollection,
  // Tags
  getUserTags,
  addTagsToBookmarks,
  removeTagsFromBookmarks,
  // Access
  recordAccess,
  // Analytics
  getBookmarkAnalytics,
  getRecommendations,
  // Errors
  NotFoundError,
};
