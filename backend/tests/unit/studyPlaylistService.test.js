/**
 * Unit tests for studyPlaylistService helper functions.
 */

const { SORT_STRATEGIES, DISCOVERY_LIMIT } = require('../../services/studyPlaylistService');

describe('studyPlaylistService – constants', () => {
  test('SORT_STRATEGIES has expected keys', () => {
    expect(SORT_STRATEGIES).toHaveProperty('manual');
    expect(SORT_STRATEGIES).toHaveProperty('newest');
    expect(SORT_STRATEGIES).toHaveProperty('difficulty_desc');
  });

  test('DISCOVERY_LIMIT is a positive integer', () => {
    expect(typeof DISCOVERY_LIMIT).toBe('number');
    expect(DISCOVERY_LIMIT).toBeGreaterThan(0);
  });
});

describe('studyPlaylistService – exports', () => {
  const svc = require('../../services/studyPlaylistService');

  test('exports all expected functions', () => {
    const fns = [
      'createPlaylist', 'getPlaylists', 'getPlaylistById',
      'updatePlaylist', 'deletePlaylist', 'duplicatePlaylist',
      'addItem', 'addBulkItems', 'removeItem', 'reorderItems',
      'updateItem', 'getNextItem', 'getPlaylistAnalytics',
      'getDashboard', 'discoverPublicPlaylists', 'forkPlaylist',
      'recalculatePlaylistProgress',
    ];
    for (const fn of fns) expect(typeof svc[fn]).toBe('function');
  });
});

describe('studyPlaylistService – validation', () => {
  const svc = require('../../services/studyPlaylistService');

  test('addItem throws when itemType missing', async () => {
    await expect(svc.addItem('u', 'p', { title: 'T' }))
      .rejects.toThrow('itemType and title are required');
  });

  test('addBulkItems throws on empty array', async () => {
    await expect(svc.addBulkItems('u', 'p', []))
      .rejects.toThrow('items must be a non-empty array');
  });

  test('addBulkItems throws exceeding limit', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      itemType: 'topic', title: `I${i}`,
    }));
    await expect(svc.addBulkItems('u', 'p', items))
      .rejects.toThrow('Maximum 50 items per bulk request');
  });

  test('createPlaylist throws when title is empty', async () => {
    await expect(svc.createPlaylist('u', { title: '' }))
      .rejects.toThrow('Playlist title is required');
  });

  test('reorderItems throws on empty array', async () => {
    await expect(svc.reorderItems('u', 'p', []))
      .rejects.toThrow('orderedIds must be a non-empty array');
  });
});
