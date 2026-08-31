import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fs = require('fs');
const path = require('path');

const DAEMON_PATH = path.join(__dirname, '..', '..', 'workers', 'matchmakerDaemon.js');
const SOURCE = fs.readFileSync(DAEMON_PATH, 'utf8');

/**
 * `workers/matchmakerDaemon.js` was merged with the conflict markers deleted
 * rather than resolved, so both sides of the conflict were kept and the bare
 * branch labels were left in the source. The splice landed inside the export
 * literal:
 *
 *   module.exports = {
 *     runMatchmakerCycle,
 *     startDaemon,
 *     stopDaemon,
 *     BASE_THRESHOLD,
 *
 *   const redisService = require('../services/redisService');
 *   ... the entire other implementation ...
 *   module.exports = {
 *     findMatches,
 *     startMatchmakerDaemon,
 *     stopMatchmakerDaemon,
 *    main
 *   };
 *
 * `server.js` calls `startMatchmakerDaemon()` and `battleHandler` subscribes to
 * the `matchmaking:matched` channel this implementation publishes on, so this
 * is the side that survived. The other stored a JSON member carrying joinTime
 * against the same queue key and emitted socket events directly; keeping both
 * would have left the reader parsing members the writer never wrote.
 */
const redisService = require('../../services/redisService');
const { BattleSession, Quiz } = require('../../models');

const zrange = vi.fn();
const zrem = vi.fn();
const get = vi.fn();
const del = vi.fn();
const publish = vi.fn();

const daemon = require('../../workers/matchmakerDaemon');

const originalCreate = BattleSession.create;
const originalFindOne = Quiz.findOne;

/** Flattens players into the [member, score, member, score] shape zrange returns. */
const queueReply = (...players) => players.flatMap(({ id, elo }) => [id, String(elo)]);

beforeEach(() => {
  zrange.mockReset().mockResolvedValue([]);
  zrem.mockReset().mockResolvedValue(1);
  get.mockReset().mockResolvedValue(String(Date.now()));
  del.mockReset().mockResolvedValue(1);
  publish.mockReset().mockResolvedValue(1);

  redisService.isReady = true;
  redisService.client = { zrange, zrem, get, del, publish };

  BattleSession.create = vi.fn().mockResolvedValue({ id: 'battle-1' });
  Quiz.findOne = vi.fn().mockResolvedValue({ id: 'quiz-1' });
});

afterEach(() => {
  daemon.stopMatchmakerDaemon();
  BattleSession.create = originalCreate;
  Quiz.findOne = originalFindOne;
});

describe('matchmakerDaemon source integrity', () => {
  it('parses as valid JavaScript', () => {
    expect(() => new Function(SOURCE)).not.toThrow();
  });

  it('carries no conflict markers', () => {
    expect(SOURCE).not.toMatch(/^(?:<{7}|={7}|>{7})/m);
  });

  it('carries no stripped-marker branch labels', () => {
    const labels = SOURCE.split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => /^\s(?:main|master|(?:feat|fix|chore|feature)\/[\w.-]+)\s*$/.test(line))
      .map(({ line, number }) => `matchmakerDaemon.js:${number}:${line}`);

    expect(labels).toEqual([]);
  });

  it('exports through exactly one module.exports', () => {
    // The merge left two, with an entire implementation spliced between them.
    expect([...SOURCE.matchAll(/^module\.exports\s*=/gm)]).toHaveLength(1);
  });

  it('keeps a single matching loop', () => {
    const loops = [...SOURCE.matchAll(/^async function (findMatches|runMatchmakerCycle)\b/gm)];

    expect(loops).toHaveLength(1);
    expect(loops[0][1]).toBe('findMatches');
  });

  it('exports the entry point server.js starts', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8');

    expect(server).toMatch(/startMatchmakerDaemon/);
    expect(typeof daemon.startMatchmakerDaemon).toBe('function');
    expect(typeof daemon.stopMatchmakerDaemon).toBe('function');
    expect(typeof daemon.findMatches).toBe('function');
  });

  it('reads the queue key from the service that writes it', () => {
    // Both halves of the merge hardcoded 'matchmaking:queue' separately, which
    // is how they drifted onto incompatible member encodings unnoticed.
    expect(SOURCE).toMatch(/require\('\.\.\/services\/matchmakingService'\)/);
    expect(SOURCE).not.toMatch(/zrange\('matchmaking:queue'/);
  });
});

describe('findMatches guards', () => {
  it('does nothing while Redis is offline', async () => {
    redisService.isReady = false;

    await daemon.findMatches();

    expect(zrange).not.toHaveBeenCalled();
  });

  it('does nothing without a client', async () => {
    redisService.client = null;

    await daemon.findMatches();

    expect(zrange).not.toHaveBeenCalled();
  });

  it('does nothing with an empty queue', async () => {
    zrange.mockResolvedValue([]);

    await daemon.findMatches();

    expect(BattleSession.create).not.toHaveBeenCalled();
  });

  it('does nothing with a single player queued', async () => {
    // Each player occupies two slots, so one player is a length of 2.
    zrange.mockResolvedValue(queueReply({ id: 'user-1', elo: 1200 }));

    await daemon.findMatches();

    expect(BattleSession.create).not.toHaveBeenCalled();
  });

  it('swallows a Redis failure rather than killing the interval', async () => {
    zrange.mockRejectedValue(new Error('connection lost'));

    await expect(daemon.findMatches()).resolves.toBeUndefined();
  });
});

describe('findMatches pairing', () => {
  it('pairs two players inside the base bracket', async () => {
    zrange.mockResolvedValue(queueReply({ id: 'user-1', elo: 1200 }, { id: 'user-2', elo: 1220 }));

    await daemon.findMatches();

    expect(zrem).toHaveBeenCalledWith('matchmaking:queue', 'user-1', 'user-2');
    expect(BattleSession.create).toHaveBeenCalledTimes(1);
  });

  it('leaves players outside the bracket queued', async () => {
    zrange.mockResolvedValue(queueReply({ id: 'user-1', elo: 1000 }, { id: 'user-2', elo: 1400 }));

    await daemon.findMatches();

    expect(BattleSession.create).not.toHaveBeenCalled();
    expect(zrem).not.toHaveBeenCalled();
  });

  it('widens the bracket by 50 points every 5 seconds waited', async () => {
    // A 400-point gap needs 8 widenings, so 40 seconds of waiting.
    zrange.mockResolvedValue(queueReply({ id: 'user-1', elo: 1000 }, { id: 'user-2', elo: 1400 }));
    get.mockResolvedValue(String(Date.now() - 40_000));

    await daemon.findMatches();

    expect(BattleSession.create).toHaveBeenCalledTimes(1);
  });

  it('takes the wider of the two players brackets', async () => {
    // One player has waited long enough for the pair even though the other
    // just arrived.
    zrange.mockResolvedValue(queueReply({ id: 'patient', elo: 1000 }, { id: 'fresh', elo: 1300 }));
    get.mockImplementation(async (key) =>
      key.includes('patient') ? String(Date.now() - 30_000) : String(Date.now())
    );

    await daemon.findMatches();

    expect(BattleSession.create).toHaveBeenCalledTimes(1);
  });

  it('sorts by ELO before pairing', async () => {
    // Fed out of order, the two 1200s should still find each other rather than
    // each being compared against the outlier.
    zrange.mockResolvedValue(
      queueReply({ id: 'high', elo: 1900 }, { id: 'low-a', elo: 1200 }, { id: 'low-b', elo: 1210 })
    );

    await daemon.findMatches();

    expect(zrem).toHaveBeenCalledWith('matchmaking:queue', 'low-a', 'low-b');
  });

  it('never puts a player in two matches in one pass', async () => {
    zrange.mockResolvedValue(
      queueReply(
        { id: 'user-1', elo: 1200 },
        { id: 'user-2', elo: 1210 },
        { id: 'user-3', elo: 1220 },
        { id: 'user-4', elo: 1230 }
      )
    );

    await daemon.findMatches();

    const matched = zrem.mock.calls.flatMap((call) => call.slice(1));

    expect(matched).toHaveLength(4);
    expect(new Set(matched).size).toBe(4);
  });

  it('leaves the odd player out of an odd-sized queue', async () => {
    zrange.mockResolvedValue(
      queueReply(
        { id: 'user-1', elo: 1200 },
        { id: 'user-2', elo: 1210 },
        { id: 'user-3', elo: 1220 }
      )
    );

    await daemon.findMatches();

    expect(BattleSession.create).toHaveBeenCalledTimes(1);
  });

  it('treats a missing join timestamp as having just arrived', async () => {
    get.mockResolvedValue(null);
    zrange.mockResolvedValue(queueReply({ id: 'user-1', elo: 1000 }, { id: 'user-2', elo: 1400 }));

    await daemon.findMatches();

    expect(BattleSession.create).not.toHaveBeenCalled();
  });
});

describe('findMatches match creation', () => {
  beforeEach(() => {
    zrange.mockResolvedValue(queueReply({ id: 'user-1', elo: 1200 }, { id: 'user-2', elo: 1220 }));
  });

  it('creates a waiting battle session hosted by the lower-rated player', async () => {
    await daemon.findMatches();

    expect(BattleSession.create.mock.calls[0][0]).toMatchObject({
      hostUserId: 'user-1',
      status: 'waiting',
      roomName: 'Ranked Battle Arena',
      questionCount: 5,
      timePerQuestion: 15,
    });
  });

  it('stamps the session with a RANKED room code', async () => {
    await daemon.findMatches();

    expect(BattleSession.create.mock.calls[0][0].roomCode).toMatch(/^RANKED_[A-Z0-9]+$/);
  });

  it('attaches a quiz when one exists', async () => {
    await daemon.findMatches();

    expect(BattleSession.create.mock.calls[0][0].quiz).toBe('quiz-1');
  });

  it('creates the session with a null quiz when none exists', async () => {
    Quiz.findOne.mockResolvedValue(null);

    await daemon.findMatches();

    expect(BattleSession.create.mock.calls[0][0].quiz).toBeNull();
  });

  it('clears both join timestamps', async () => {
    await daemon.findMatches();

    expect(del).toHaveBeenCalledWith('matchmaking:joined:user-1');
    expect(del).toHaveBeenCalledWith('matchmaking:joined:user-2');
  });

  it('publishes the pairing on the channel battleHandler subscribes to', async () => {
    await daemon.findMatches();

    const [channel, payload] = publish.mock.calls[0];

    expect(channel).toBe('matchmaking:matched');
    expect(JSON.parse(payload)).toMatchObject({ player1: 'user-1', player2: 'user-2' });
  });

  it('publishes the same room code it persisted', async () => {
    await daemon.findMatches();

    expect(JSON.parse(publish.mock.calls[0][1]).roomCode).toBe(
      BattleSession.create.mock.calls[0][0].roomCode
    );
  });

  it('is the channel battleHandler listens on', () => {
    const handler = fs.readFileSync(
      path.join(__dirname, '..', '..', 'sockets', 'battleHandler.js'),
      'utf8'
    );

    expect(handler).toMatch(/subscribe\('matchmaking:matched'\)/);
  });
});

describe('daemon lifecycle', () => {
  it('starts an interval', () => {
    vi.useFakeTimers();
    daemon.startMatchmakerDaemon();

    expect(vi.getTimerCount()).toBe(1);

    daemon.stopMatchmakerDaemon();
    vi.useRealTimers();
  });

  it('does not stack intervals when started twice', () => {
    vi.useFakeTimers();
    daemon.startMatchmakerDaemon();
    daemon.startMatchmakerDaemon();

    expect(vi.getTimerCount()).toBe(1);

    daemon.stopMatchmakerDaemon();
    vi.useRealTimers();
  });

  it('clears the interval on stop', () => {
    vi.useFakeTimers();
    daemon.startMatchmakerDaemon();
    daemon.stopMatchmakerDaemon();

    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });

  it('tolerates a stop without a start', () => {
    expect(() => daemon.stopMatchmakerDaemon()).not.toThrow();
  });
});
