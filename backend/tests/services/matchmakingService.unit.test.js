import { describe, it, expect, beforeEach, vi } from 'vitest';

const fs = require('fs');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '..', '..', 'services', 'matchmakingService.js');
const SOURCE = fs.readFileSync(SERVICE_PATH, 'utf8');

/**
 * `services/matchmakingService.js` was merged with the conflict markers deleted
 * rather than resolved. The `<<<<<<<`, `=======` and `>>>>>>>` lines were
 * removed but the branch labels they carried were left behind as bare source
 * lines, and both sides of the conflict were kept:
 *
 *    feat/real-time-matchmaker-1794
 *   const redis = require('../config/redis');
 *
 *   const redisService = require('./redisService');
 *   const logger = require('../utils/logger');
 *    main
 *
 * ` feat/real-time-matchmaker-1794` parses as an expression statement, so the
 * file survived to the first JSDoc block left stranded outside a comment and
 * died on `SyntaxError: Unexpected token '*'`.
 *
 * `server.js` starts `startMatchmakerDaemon` and `battleHandler` subscribes to
 * the `matchmaking:matched` channel, so the surviving implementation is the one
 * built on `redisService` — the branch side stored a different member encoding
 * against the same queue key and had no production caller.
 *
 * `redisService` is a singleton, so the double is installed on it directly
 * rather than through the module registry.
 */
const redisService = require('../../services/redisService');

const zadd = vi.fn();
const zrem = vi.fn();
const set = vi.fn();
const del = vi.fn();

const matchmakingService = require('../../services/matchmakingService');

beforeEach(() => {
  zadd.mockReset().mockResolvedValue(1);
  zrem.mockReset().mockResolvedValue(1);
  set.mockReset().mockResolvedValue('OK');
  del.mockReset().mockResolvedValue(1);

  redisService.isReady = true;
  redisService.client = { zadd, zrem, set, del };
});

describe('matchmakingService source integrity', () => {
  it('parses as valid JavaScript', () => {
    expect(() => new Function(SOURCE)).not.toThrow();
  });

  it('carries no conflict markers', () => {
    expect(SOURCE).not.toMatch(/^(?:<{7}|={7}|>{7})/m);
  });

  it('carries no stripped-marker branch labels', () => {
    // The residue of a hand-deleted marker: a bare branch name on its own line
    // where `<<<<<<< ` or `>>>>>>> ` used to prefix it.
    const labels = SOURCE.split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => /^\s(?:main|master|(?:feat|fix|chore|feature)\/[\w.-]+)\s*$/.test(line))
      .map(({ line, number }) => `matchmakingService.js:${number}:${line}`);

    expect(labels).toEqual([]);
  });

  it('keeps a single implementation of the queue', () => {
    // Both sides defined an enqueue against the same `matchmaking:queue` key
    // with incompatible member encodings — one a JSON blob carrying joinTime,
    // the other a bare userId with the timestamp in a sibling key. Keeping
    // both would have had the daemon reading members the writer never wrote.
    const enqueues = [...SOURCE.matchAll(/^async function (joinQueue|addToQueue)\b/gm)];

    expect(enqueues).toHaveLength(1);
    expect(enqueues[0][1]).toBe('joinQueue');
  });

  it('exports through exactly one module.exports', () => {
    expect([...SOURCE.matchAll(/^module\.exports\s*=/gm)]).toHaveLength(1);
  });

  it('exports the surface its consumers import', () => {
    // battleHandler destructures calculateEloChange; matchmakerDaemon imports
    // QUEUE_KEY so the reader and the writer cannot drift apart.
    for (const name of ['joinQueue', 'leaveQueue', 'calculateEloChange']) {
      expect(typeof matchmakingService[name], name).toBe('function');
    }

    expect(matchmakingService.QUEUE_KEY).toBe('matchmaking:queue');
  });

  it('imports only the Redis client it actually uses', () => {
    expect(SOURCE).toMatch(/require\('\.\/redisService'\)/);
    expect(SOURCE).not.toMatch(/require\('\.\.\/config\/redis'\)/);
  });
});

describe('joinQueue', () => {
  it('scores the sorted-set entry by ELO', async () => {
    await matchmakingService.joinQueue('user-111', 1300);

    expect(zadd).toHaveBeenCalledWith('matchmaking:queue', 1300, 'user-111');
  });

  it('records the join timestamp under its own key', async () => {
    await matchmakingService.joinQueue('user-111', 1300);

    expect(set).toHaveBeenCalledWith('matchmaking:joined:user-111', expect.any(Number));
  });

  it('defaults an unrated player to 1200', async () => {
    await matchmakingService.joinQueue('user-new');

    expect(zadd).toHaveBeenCalledWith('matchmaking:queue', 1200, 'user-new');
  });

  it('reports success', async () => {
    await expect(matchmakingService.joinQueue('user-111', 1300)).resolves.toBe(true);
  });

  it('bypasses the queue when Redis is offline', async () => {
    redisService.isReady = false;

    await expect(matchmakingService.joinQueue('user-111', 1300)).resolves.toBe(false);
    expect(zadd).not.toHaveBeenCalled();
  });

  it('bypasses the queue when there is no client', async () => {
    redisService.client = null;

    await expect(matchmakingService.joinQueue('user-111', 1300)).resolves.toBe(false);
  });

  it('reports failure rather than throwing when Redis errors', async () => {
    zadd.mockRejectedValue(new Error('READONLY'));

    await expect(matchmakingService.joinQueue('user-111', 1300)).resolves.toBe(false);
  });
});

describe('leaveQueue', () => {
  it('removes the member and its join timestamp', async () => {
    await matchmakingService.leaveQueue('user-111');

    expect(zrem).toHaveBeenCalledWith('matchmaking:queue', 'user-111');
    expect(del).toHaveBeenCalledWith('matchmaking:joined:user-111');
  });

  it('reports success', async () => {
    await expect(matchmakingService.leaveQueue('user-111')).resolves.toBe(true);
  });

  it('is a no-op when Redis is offline', async () => {
    redisService.isReady = false;

    await expect(matchmakingService.leaveQueue('user-111')).resolves.toBe(false);
    expect(zrem).not.toHaveBeenCalled();
  });

  it('reports failure rather than throwing when Redis errors', async () => {
    zrem.mockRejectedValue(new Error('connection lost'));

    await expect(matchmakingService.leaveQueue('user-111')).resolves.toBe(false);
  });

  it('writes and removes against the same key joinQueue used', async () => {
    // The two sides of the merge disagreed on this. Pinning it means a future
    // change to one has to move the other.
    await matchmakingService.joinQueue('user-111', 1300);
    await matchmakingService.leaveQueue('user-111');

    expect(zadd.mock.calls[0][0]).toBe(zrem.mock.calls[0][0]);
    expect(set.mock.calls[0][0]).toBe(del.mock.calls[0][0]);
  });
});

describe('calculateEloChange', () => {
  it('moves the winner up and the loser down from equal ratings', () => {
    const { newEloA, newEloB } = matchmakingService.calculateEloChange(1200, 1200, 1);

    expect(newEloA).toBeGreaterThan(1200);
    expect(newEloB).toBeLessThan(1200);
  });

  it('leaves equal ratings untouched on a draw', () => {
    expect(matchmakingService.calculateEloChange(1200, 1200, 0.5)).toEqual({
      newEloA: 1200,
      newEloB: 1200,
    });
  });

  it('awards the full K factor for an even upset', () => {
    // Equal ratings means an expected score of 0.5 each, so the winner takes
    // K * (1 - 0.5) = 16.
    const { newEloA, newEloB } = matchmakingService.calculateEloChange(1200, 1200, 1);

    expect(newEloA).toBe(1216);
    expect(newEloB).toBe(1184);
  });

  it('awards more for beating a stronger opponent', () => {
    const upset = matchmakingService.calculateEloChange(1000, 1600, 1);
    const expected = matchmakingService.calculateEloChange(1600, 1000, 1);

    expect(upset.newEloA - 1000).toBeGreaterThan(expected.newEloA - 1600);
  });

  it('is symmetric between the two players', () => {
    const forward = matchmakingService.calculateEloChange(1400, 1100, 1);
    const reversed = matchmakingService.calculateEloChange(1100, 1400, 0);

    expect(forward.newEloA).toBe(reversed.newEloB);
    expect(forward.newEloB).toBe(reversed.newEloA);
  });

  it('conserves rating points across a decisive result', () => {
    const { newEloA, newEloB } = matchmakingService.calculateEloChange(1350, 1290, 1);

    expect(newEloA + newEloB).toBe(1350 + 1290);
  });

  it('floors a rating at 100', () => {
    const { newEloA } = matchmakingService.calculateEloChange(100, 2400, 0);

    expect(newEloA).toBeGreaterThanOrEqual(100);
  });

  it('returns integers', () => {
    const { newEloA, newEloB } = matchmakingService.calculateEloChange(1234, 1111, 0.5);

    expect(Number.isInteger(newEloA)).toBe(true);
    expect(Number.isInteger(newEloB)).toBe(true);
  });

  it('is the function battleHandler destructures', () => {
    const handler = fs.readFileSync(
      path.join(__dirname, '..', '..', 'sockets', 'battleHandler.js'),
      'utf8'
    );

    expect(handler).toMatch(/matchmakingService\.calculateEloChange\(/);
    expect(typeof matchmakingService.calculateEloChange).toBe('function');
  });
});
