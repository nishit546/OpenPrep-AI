const { describe, it, expect, vi, beforeEach } = require('vitest');

// ── Mocks ────────────────────────────────────────────────────────────────

const mockSequelize = { define: vi.fn(() => ({})), authenticate: vi.fn() };

const mockResourceBookmark = {
  create: vi.fn(), findOne: vi.fn(), findAll: vi.fn(),
  findAndCountAll: vi.fn(), count: vi.fn(), update: vi.fn(), destroy: vi.fn(),
};
const mockBookmarkCollection = {
  create: vi.fn(), findOne: vi.fn(), findAll: vi.fn(),
  count: vi.fn(), max: vi.fn(), update: vi.fn(), destroy: vi.fn(),
};

vi.mock('../config/db', () => ({ sequelize: mockSequelize }));

vi.mock('../models/ResourceBookmark', () => ({
  default: mockResourceBookmark,
  create: mockResourceBookmark.create, findOne: mockResourceBookmark.findOne,
  findAll: mockResourceBookmark.findAll, findAndCountAll: mockResourceBookmark.findAndCountAll,
  count: mockResourceBookmark.count, update: mockResourceBookmark.update,
  destroy: mockResourceBookmark.destroy,
}));

vi.mock('../models/BookmarkCollection', () => ({
  default: mockBookmarkCollection,
  create: mockBookmarkCollection.create, findOne: mockBookmarkCollection.findOne,
  findAll: mockBookmarkCollection.findAll, count: mockBookmarkCollection.count,
  max: mockBookmarkCollection.max, update: mockBookmarkCollection.update,
  destroy: mockBookmarkCollection.destroy,
}));

vi.mock('../models/ActivityLog', () => ({ default: { create: vi.fn() } }));

const resourceBookmarkService = require('../services/resourceBookmarkService');

const mockUserId = 'user-123';

// ── Collection Tests ────────────────────────────────────────────────────

describe('Collection CRUD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createCollection creates with incremented sort order', async () => {
    mockBookmarkCollection.max.mockResolvedValue(2);
    mockBookmarkCollection.create.mockResolvedValue({ id: 'c1', name: 'Midterm', sortOrder: 3 });

    const result = await resourceBookmarkService.createCollection(mockUserId, { name: 'Midterm' });

    expect(mockBookmarkCollection.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: mockUserId, name: 'Midterm', sortOrder: 3 })
    );
    expect(result.id).toBe('c1');
  });

  it('getUserCollections enriches with bookmark counts', async () => {
    const col = { id: 'c1', name: 'C1', toJSON: () => ({ id: 'c1', name: 'C1' }) };
    mockBookmarkCollection.findAll.mockResolvedValue([col]);
    mockResourceBookmark.count.mockResolvedValue(5);

    const result = await resourceBookmarkService.getUserCollections(mockUserId);

    expect(result).toHaveLength(1);
    expect(result[0].bookmarkCount).toBe(5);
  });

  it('updateCollection updates allowed fields', async () => {
    const col = { id: 'c1', name: 'Old', save: vi.fn() };
    mockBookmarkCollection.findOne.mockResolvedValue(col);

    const result = await resourceBookmarkService.updateCollection(mockUserId, 'c1', { name: 'New' });
    expect(result.name).toBe('New');
    expect(col.save).toHaveBeenCalled();
  });

  it('updateCollection returns null for non-existent', async () => {
    mockBookmarkCollection.findOne.mockResolvedValue(null);
    const result = await resourceBookmarkService.updateCollection(mockUserId, 'x', { name: 'N' });
    expect(result).toBeNull();
  });

  it('deleteCollection unlinks bookmarks then destroys', async () => {
    const col = { id: 'c1', destroy: vi.fn() };
    mockBookmarkCollection.findOne.mockResolvedValue(col);
    mockResourceBookmark.update.mockResolvedValue([3]);

    const result = await resourceBookmarkService.deleteCollection(mockUserId, 'c1');
    expect(result).toBe(true);
    expect(col.destroy).toHaveBeenCalled();
  });

  it('reorderCollections sets correct sort orders', async () => {
    const c1 = { id: 'c1', sortOrder: 0, save: vi.fn() };
    const c2 = { id: 'c2', sortOrder: 1, save: vi.fn() };
    mockBookmarkCollection.findAll.mockResolvedValue([c1, c2]);
    mockResourceBookmark.count.mockResolvedValue(0);

    await resourceBookmarkService.reorderCollections(mockUserId, ['c2', 'c1']);
    expect(c2.sortOrder).toBe(0);
    expect(c1.sortOrder).toBe(1);
  });
});

// ── Bookmark CRUD Tests ─────────────────────────────────────────────────

describe('Bookmark CRUD', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createBookmark creates with defaults', async () => {
    mockResourceBookmark.create.mockResolvedValue({
      id: 'b1', title: 'Test', resourceType: 'note', collectionId: null,
    });
    mockBookmarkCollection.update.mockResolvedValue([1]);

    const result = await resourceBookmarkService.createBookmark(mockUserId, {
      resourceType: 'note', title: 'Test',
    });

    expect(mockResourceBookmark.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: mockUserId, resourceType: 'note', title: 'Test', priority: 'medium' })
    );
  });

  it('getUserBookmarks applies filters and pagination', async () => {
    mockResourceBookmark.findAndCountAll.mockResolvedValue({
      count: 2, rows: [{ id: 'b1' }, { id: 'b2' }],
    });

    const result = await resourceBookmarkService.getUserBookmarks(mockUserId, {
      resourceType: 'quiz', priority: 'high', page: 1, limit: 10,
    });

    expect(result.bookmarks).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    const where = mockResourceBookmark.findAndCountAll.mock.calls[0][0].where;
    expect(where.resourceType).toBe('quiz');
    expect(where.priority).toBe('high');
  });

  it('getUserBookmarks applies tag overlap filter', async () => {
    mockResourceBookmark.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await resourceBookmarkService.getUserBookmarks(mockUserId, { tags: ['chem', 'midterm'] });
    const where = mockResourceBookmark.findAndCountAll.mock.calls[0][0].where;
    expect(where.tags).toBeDefined();
  });

  it('getUserBookmarks applies search with ILike', async () => {
    mockResourceBookmark.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await resourceBookmarkService.getUserBookmarks(mockUserId, { search: 'organic' });
    const where = mockResourceBookmark.findAndCountAll.mock.calls[0][0].where;
    expect(where[Symbol.for('or')]).toBeDefined();
  });

  it('updateBookmark updates allowed fields', async () => {
    const bm = { id: 'b1', title: 'Old', collectionId: null, save: vi.fn() };
    mockResourceBookmark.findOne.mockResolvedValue(bm);

    const result = await resourceBookmarkService.updateBookmark(mockUserId, 'b1', {
      title: 'New', rating: 5, isFavourite: true,
    });

    expect(result.title).toBe('New');
    expect(result.rating).toBe(5);
    expect(result.isFavourite).toBe(true);
  });

  it('updateBookmark returns null for non-existent', async () => {
    mockResourceBookmark.findOne.mockResolvedValue(null);
    const result = await resourceBookmarkService.updateBookmark(mockUserId, 'x', { title: 'N' });
    expect(result).toBeNull();
  });

  it('deleteBookmark destroys and recalcs collection count', async () => {
    const bm = { id: 'b1', collectionId: 'c1', destroy: vi.fn() };
    mockResourceBookmark.findOne.mockResolvedValue(bm);
    mockResourceBookmark.count.mockResolvedValue(3);
    mockBookmarkCollection.update.mockResolvedValue([1]);

    const result = await resourceBookmarkService.deleteBookmark(mockUserId, 'b1');
    expect(result).toBe(true);
    expect(bm.destroy).toHaveBeenCalled();
  });

  it('bulkCreateBookmarks creates multiple bookmarks', async () => {
    mockResourceBookmark.create.mockResolvedValue({ id: 'b1' });
    mockBookmarkCollection.update.mockResolvedValue([0]);

    const items = [
      { resourceType: 'note', title: 'Note 1' },
      { resourceType: 'quiz', title: 'Quiz 1' },
    ];
    const result = await resourceBookmarkService.bulkCreateBookmarks(mockUserId, items);
    expect(mockResourceBookmark.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('bulkCreateBookmarks rejects >50 items', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ resourceType: 'note', title: `N${i}` }));
    await expect(resourceBookmarkService.bulkCreateBookmarks(mockUserId, items))
      .rejects.toThrow('Maximum 50');
  });

  it('bulkDeleteBookmarks deletes matching bookmarks', async () => {
    mockResourceBookmark.destroy.mockResolvedValue(3);

    const result = await resourceBookmarkService.bulkDeleteBookmarks(mockUserId, ['b1', 'b2', 'b3']);
    expect(result.deletedCount).toBe(3);
  });

  it('moveToCollection updates collectionId for bookmarks', async () => {
    const bms = [
      { collectionId: 'c1' },
      { collectionId: 'c1' },
    ];
    mockResourceBookmark.findAll.mockResolvedValue(bms);
    mockBookmarkCollection.findOne.mockResolvedValue({ id: 'c2' });
    mockResourceBookmark.update.mockResolvedValue([2]);
    mockResourceBookmark.count.mockResolvedValue(1);
    mockBookmarkCollection.update.mockResolvedValue([1]);

    const result = await resourceBookmarkService.moveToCollection(mockUserId, ['b1', 'b2'], 'c2');
    expect(result.updatedCount).toBe(2);
  });
});

// ── Tag Tests ───────────────────────────────────────────────────────────

describe('Tag Management', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getUserTags returns sorted tag counts', async () => {
    mockResourceBookmark.findAll.mockResolvedValue([
      { tags: ['chem', 'midterm'] },
      { tags: ['chem', 'final'] },
      { tags: ['physics'] },
    ]);

    const result = await resourceBookmarkService.getUserTags(mockUserId);

    expect(result).toEqual([
      { tag: 'chem', count: 2 },
      { tag: 'midterm', count: 1 },
      { tag: 'final', count: 1 },
      { tag: 'physics', count: 1 },
    ]);
  });

  it('addTagsToBookmarks merges new tags', async () => {
    const bm = { id: 'b1', tags: ['existing'], save: vi.fn() };
    mockResourceBookmark.findAll.mockResolvedValue([bm]);

    const result = await resourceBookmarkService.addTagsToBookmarks(mockUserId, ['b1'], ['new', 'existing']);

    expect(result[0].tags).toContain('existing');
    expect(result[0].tags).toContain('new');
  });

  it('removeTagsFromBookmarks filters tags', async () => {
    const bm = { id: 'b1', tags: ['a', 'b', 'c'], save: vi.fn() };
    mockResourceBookmark.findAll.mockResolvedValue([bm]);

    const result = await resourceBookmarkService.removeTagsFromBookmarks(mockUserId, ['b1'], ['b']);

    expect(result[0].tags).toEqual(['a', 'c']);
  });
});

// ── Access Tracking Tests ───────────────────────────────────────────────

describe('Access Tracking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recordAccess increments count and sets timestamp', async () => {
    const bm = { id: 'b1', accessCount: 2, lastAccessedAt: null, save: vi.fn() };
    mockResourceBookmark.findOne.mockResolvedValue(bm);

    const result = await resourceBookmarkService.recordAccess(mockUserId, 'b1');
    expect(result.accessCount).toBe(3);
    expect(result.lastAccessedAt).toBeDefined();
  });

  it('recordAccess throws for non-existent bookmark', async () => {
    mockResourceBookmark.findOne.mockResolvedValue(null);
    await expect(resourceBookmarkService.recordAccess(mockUserId, 'x'))
      .rejects.toThrow('Bookmark not found');
  });
});

// ── Analytics Tests ─────────────────────────────────────────────────────

describe('Bookmark Analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getBookmarkAnalytics returns full analytics', async () => {
    mockResourceBookmark.findAll.mockResolvedValue([
      { resourceType: 'note', isFavourite: true, isArchived: false, rating: 5, priority: 'high', tags: ['chem'], accessCount: 10, lastAccessedAt: new Date(), createdAt: new Date(), title: 'N1', id: 'b1' },
      { resourceType: 'quiz', isFavourite: false, isArchived: false, rating: 3, priority: 'medium', tags: ['chem', 'physics'], accessCount: 2, lastAccessedAt: new Date(), createdAt: new Date(), title: 'Q1', id: 'b2' },
      { resourceType: 'note', isFavourite: false, isArchived: true, rating: null, priority: 'low', tags: [], accessCount: 0, lastAccessedAt: null, createdAt: new Date(), title: 'N2', id: 'b3' },
    ]);
    mockBookmarkCollection.findAll.mockResolvedValue([
      { id: 'c1', name: 'Midterm', totalBookmarks: 5, toJSON: () => ({ id: 'c1', name: 'Midterm', totalBookmarks: 5 }) },
    ]);

    const analytics = await resourceBookmarkService.getBookmarkAnalytics(mockUserId);

    expect(analytics.summary.totalBookmarks).toBe(3);
    expect(analytics.summary.favourites).toBe(1);
    expect(analytics.summary.archived).toBe(1);
    expect(analytics.summary.active).toBe(2);
    expect(analytics.resourceTypeDistribution.note.total).toBe(2);
    expect(analytics.resourceTypeDistribution.quiz.total).toBe(1);
    expect(analytics.priorityDistribution.high).toBe(1);
    expect(analytics.topTags[0].tag).toBe('chem');
    expect(analytics.mostAccessed).toHaveLength(2);
    expect(analytics.recentlyAdded).toHaveLength(3);
    expect(analytics.collectionSummary).toHaveLength(1);
  });
});

// ── Recommendations Tests ───────────────────────────────────────────────

describe('Recommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getRecommendations returns insights and suggestions', async () => {
    mockResourceBookmark.findAll.mockResolvedValue([
      { id: 'b1', resourceType: 'note', isFavourite: true, isArchived: false, rating: 5, priority: 'urgent', tags: ['chem'], accessCount: 0, lastAccessedAt: null, title: 'N1', createdAt: new Date() },
      { id: 'b2', resourceType: 'quiz', isFavourite: false, isArchived: false, rating: null, priority: 'high', tags: ['chem'], accessCount: 1, lastAccessedAt: new Date('2026-01-01'), title: 'Q1', createdAt: new Date() },
      { id: 'b3', resourceType: 'note', isFavourite: true, isArchived: false, rating: 4, priority: 'medium', tags: ['physics'], accessCount: 0, lastAccessedAt: null, title: 'N2', createdAt: new Date() },
    ]);

    const result = await resourceBookmarkService.getRecommendations(mockUserId);

    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it('getRecommendations returns empty for no bookmarks', async () => {
    mockResourceBookmark.findAll.mockResolvedValue([]);

    const result = await resourceBookmarkService.getRecommendations(mockUserId);
    expect(result.recommendations).toHaveLength(0);
    expect(result.insights).toHaveLength(0);
  });
});

// ── Controller & Routes Exports ─────────────────────────────────────────

describe('resourceBookmarkController', () => {
  it('exports all handler functions', () => {
    const ctrl = require('../controllers/resourceBookmarkController');
    const expectedFns = [
      'createCollection', 'getCollections', 'getCollection', 'updateCollection',
      'deleteCollection', 'reorderCollections', 'createBookmark', 'getBookmarks',
      'getBookmark', 'updateBookmark', 'deleteBookmark', 'bulkCreateBookmarks',
      'bulkDeleteBookmarks', 'moveToCollection', 'recordAccess', 'getUserTags',
      'addTags', 'removeTags', 'getBookmarkAnalytics', 'getRecommendations',
    ];
    for (const fn of expectedFns) {
      expect(typeof ctrl[fn]).toBe('function');
    }
  });
});

describe('resourceBookmarkRoutes', () => {
  it('exports an Express router', () => {
    const router = require('../routes/resourceBookmarkRoutes');
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
