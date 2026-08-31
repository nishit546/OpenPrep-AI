import { describe, it, expect, beforeEach, vi } from 'vitest';

const fs = require('fs');
const path = require('path');

const CONTROLLER_PATH = path.join(__dirname, '..', '..', 'controllers', 'flashcardController.js');
const SOURCE = fs.readFileSync(CONTROLLER_PATH, 'utf8');

/**
 * `reviewFlashcard` had a snippet pasted into the middle of its body — the
 * kind of block a design note carries, prefixed `// In your review endpoint:`
 * — and the paste was never adapted. It landed after the quality guard and
 * before the card lookup, at column zero, still inside the try block.
 *
 * That made `const quality` a second declaration in a scope that already had
 * `const { quality } = req.body`, which is a SyntaxError. The controller never
 * parsed, so both routers that import it — flashcardRoutes and communityRoutes
 * — failed to mount, and every flashcard and community endpoint 404'd.
 *
 * The paste was also dead on its own terms: it referenced a `flashcardId` that
 * is never defined in the handler (the card is looked up from `req.params.id`),
 * and it ended in `res.json(reviewResult)`, which would have returned before
 * the real SM-2 implementation below it ever ran.
 *
 * The models are required at module load, so doubles have to be installed on
 * the model objects before the controller is required.
 */
const Flashcard = require('../../models/Flashcard');
const Progress = require('../../models/Progress');
const User = require('../../models/User');
const gamificationService = require('../../services/gamificationService');

const findOne = vi.fn();
const findOrCreate = vi.fn();
const findByPk = vi.fn();
const awardXP = vi.fn();
const updateStreak = vi.fn();
const checkAndUnlockBadges = vi.fn();

Flashcard.findOne = findOne;
Progress.findOrCreate = findOrCreate;
User.findByPk = findByPk;
gamificationService.awardXP = awardXP;
gamificationService.updateStreak = updateStreak;
gamificationService.checkAndUnlockBadges = checkAndUnlockBadges;

delete require.cache[require.resolve('../../controllers/flashcardController')];
const flashcardController = require('../../controllers/flashcardController');

function mockRes() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

const mockReq = (overrides = {}) => ({
  params: { id: 'card-1' },
  body: { quality: 4 },
  headers: {},
  user: { id: 'user-1' },
  ...overrides,
});

/** A saveable stand-in for a Flashcard row. */
function mockCard(overrides = {}) {
  return {
    id: 'card-1',
    user: 'user-1',
    subject: 'subject-1',
    topic: 'topic-1',
    interval: 6,
    repetitions: 2,
    efactor: 2.5,
    nextReviewDate: null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  findOne.mockReset();
  findOrCreate.mockReset();
  findByPk.mockReset();
  awardXP.mockReset();
  updateStreak.mockReset();
  checkAndUnlockBadges.mockReset();

  findOne.mockResolvedValue(mockCard());
  findOrCreate.mockResolvedValue([
    { flashcardsMastered: 0, save: vi.fn().mockResolvedValue(undefined) },
  ]);
  findByPk.mockResolvedValue({ id: 'user-1' });
  awardXP.mockResolvedValue({ xp: 30, level: 2 });
  updateStreak.mockResolvedValue(undefined);
  checkAndUnlockBadges.mockResolvedValue([]);
});

describe('flashcardController source integrity', () => {
  it('parses as valid JavaScript', () => {
    // The regression itself: `Identifier 'quality' has already been declared`.
    expect(() => new Function(SOURCE)).not.toThrow();
  });

  it('declares quality exactly once inside reviewFlashcard', () => {
    const start = SOURCE.indexOf('exports.reviewFlashcard');
    const end = SOURCE.indexOf('exports.deleteFlashcard');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const body = SOURCE.slice(start, end);
    const declarations = [
      ...body.matchAll(/(?:const|let|var)\s+(?:\{\s*quality\s*\}|quality)\s*=/g),
    ];

    expect(declarations).toHaveLength(1);
  });

  it('carries no pasted design-note markers', () => {
    // `// In your review endpoint:` is what a snippet meant for a design doc
    // looks like once it has been dropped into a handler verbatim.
    const markers = SOURCE.split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => /^\/\/\s*In your\b/i.test(line))
      .map(({ line, number }) => `flashcardController.js:${number}: ${line}`);

    expect(markers).toEqual([]);
  });

  it('references no undefined flashcardId', () => {
    // The paste read `flashcardId`, which exists nowhere in the handler — the
    // card is resolved from `req.params.id`.
    const start = SOURCE.indexOf('exports.reviewFlashcard');
    const end = SOURCE.indexOf('exports.deleteFlashcard');
    const body = SOURCE.slice(start, end);

    expect(body).not.toMatch(/\bflashcardId\b/);
  });

  it('keeps every statement in reviewFlashcard indented inside the function', () => {
    // The paste sat at column zero while still inside the try block, which is
    // the visual tell that it was never adapted to its surroundings.
    const start = SOURCE.indexOf('exports.reviewFlashcard');
    const end = SOURCE.indexOf('exports.deleteFlashcard');

    const stray = SOURCE.slice(start, end)
      .split('\n')
      .slice(1)
      .filter((line) => /^(?:const|let|var|return|await|if|res)\b/.test(line));

    expect(stray).toEqual([]);
  });

  it('has balanced braces', () => {
    const stripped = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/`(?:\\.|[^`\\])*`/g, '``')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""');

    const open = (stripped.match(/\{/g) || []).length;
    const close = (stripped.match(/\}/g) || []).length;

    expect(open).toBe(close);
  });

  it('exports the handlers flashcardRoutes imports', () => {
    // The parse failure took the whole module down, so every one of these was
    // undefined at mount time.
    for (const handler of ['reviewFlashcard', 'deleteFlashcard', 'createFlashcard']) {
      expect(typeof flashcardController[handler], handler).toBe('function');
    }
  });
});

describe('reviewFlashcard rejects invalid quality', () => {
  it.each([
    ['undefined', undefined],
    ['below range', -1],
    ['above range', 6],
  ])('rejects a %s quality with 400', async (_label, quality) => {
    const res = mockRes();

    await flashcardController.reviewFlashcard(mockReq({ body: { quality } }), res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2, 3, 4, 5])('accepts quality %i', async (quality) => {
    const res = mockRes();

    await flashcardController.reviewFlashcard(mockReq({ body: { quality } }), res, vi.fn());

    expect(res.statusCode).toBe(200);
  });

  it('does not reach the scheduler before validating', async () => {
    const res = mockRes();

    await flashcardController.reviewFlashcard(mockReq({ body: {} }), res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/quality score between 0 and 5/);
  });
});

describe('reviewFlashcard reaches the SM-2 implementation', () => {
  it('looks the card up scoped to the requesting user', async () => {
    // The paste returned before this line ever ran. If it comes back, the
    // lookup stops happening and this fails.
    await flashcardController.reviewFlashcard(mockReq(), mockRes(), vi.fn());

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne.mock.calls[0][0]).toEqual({ where: { id: 'card-1', user: 'user-1' } });
  });

  it('404s when the card does not belong to the user', async () => {
    findOne.mockResolvedValue(null);
    const res = mockRes();

    await flashcardController.reviewFlashcard(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, error: 'Flashcard not found' });
  });

  it('advances the interval on a successful recall', async () => {
    const card = mockCard({ interval: 6, repetitions: 2, efactor: 2.5 });
    findOne.mockResolvedValue(card);

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 5 } }),
      mockRes(),
      vi.fn()
    );

    expect(card.interval).toBe(15); // round(6 * 2.5)
    expect(card.repetitions).toBe(3);
    expect(card.save).toHaveBeenCalledTimes(1);
  });

  it('resets repetitions on a failed recall', async () => {
    const card = mockCard({ interval: 30, repetitions: 4, efactor: 2.5 });
    findOne.mockResolvedValue(card);

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 1 } }),
      mockRes(),
      vi.fn()
    );

    expect(card.repetitions).toBe(0);
    expect(card.interval).toBe(1);
  });

  it('uses the first step interval for a brand new card', async () => {
    const card = mockCard({ interval: 0, repetitions: 0, efactor: 2.5 });
    findOne.mockResolvedValue(card);

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 4 } }),
      mockRes(),
      vi.fn()
    );

    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(1);
  });

  it('uses the second step interval on the following review', async () => {
    const card = mockCard({ interval: 1, repetitions: 1, efactor: 2.5 });
    findOne.mockResolvedValue(card);

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 4 } }),
      mockRes(),
      vi.fn()
    );

    expect(card.interval).toBe(6);
    expect(card.repetitions).toBe(2);
  });

  it('honours the user SM-2 modifiers', async () => {
    const card = mockCard({ interval: 0, repetitions: 0 });
    findOne.mockResolvedValue(card);

    const req = mockReq({
      user: { id: 'user-1', sm2Step1Interval: 3, sm2Step2Interval: 9 },
    });

    await flashcardController.reviewFlashcard(req, mockRes(), vi.fn());

    expect(card.interval).toBe(3);
  });

  it('never lets the efactor fall below 1.3', async () => {
    const card = mockCard({ interval: 1, repetitions: 0, efactor: 1.3 });
    findOne.mockResolvedValue(card);

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 0 } }),
      mockRes(),
      vi.fn()
    );

    expect(card.efactor).toBeGreaterThanOrEqual(1.3);
  });

  it('sets the next review date forward by the new interval', async () => {
    const card = mockCard({ interval: 6, repetitions: 2, efactor: 2.5 });
    findOne.mockResolvedValue(card);
    const before = Date.now();

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 5 } }),
      mockRes(),
      vi.fn()
    );

    const days = (card.nextReviewDate.getTime() - before) / (24 * 60 * 60 * 1000);

    expect(Math.round(days)).toBe(15);
  });
});

describe('reviewFlashcard records mastery progress', () => {
  it('increments mastered count at quality 4 and above', async () => {
    const progress = { flashcardsMastered: 2, save: vi.fn().mockResolvedValue(undefined) };
    findOrCreate.mockResolvedValue([progress]);

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 4 } }),
      mockRes(),
      vi.fn()
    );

    expect(progress.flashcardsMastered).toBe(3);
    expect(progress.save).toHaveBeenCalledTimes(1);
  });

  it('leaves progress alone below quality 4', async () => {
    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 3 } }),
      mockRes(),
      vi.fn()
    );

    expect(findOrCreate).not.toHaveBeenCalled();
  });

  it('tracks subject-level cards under a null topic', async () => {
    findOne.mockResolvedValue(mockCard({ topic: null }));

    await flashcardController.reviewFlashcard(
      mockReq({ body: { quality: 5 } }),
      mockRes(),
      vi.fn()
    );

    expect(findOrCreate.mock.calls[0][0].where).toEqual({
      user: 'user-1',
      subject: 'subject-1',
      topic: null,
    });
  });
});

describe('reviewFlashcard awards progression', () => {
  it('awards XP for the review', async () => {
    await flashcardController.reviewFlashcard(mockReq(), mockRes(), vi.fn());

    expect(awardXP).toHaveBeenCalledWith('user-1', 30, 'flashcard_review');
  });

  it('passes an IANA timezone straight through', async () => {
    const req = mockReq({ headers: { 'x-timezone': 'Asia/Kolkata' } });

    await flashcardController.reviewFlashcard(req, mockRes(), vi.fn());

    expect(updateStreak).toHaveBeenCalledWith('user-1', 'Asia/Kolkata');
    expect(checkAndUnlockBadges.mock.calls[0][2]).toEqual({ timeZone: 'Asia/Kolkata' });
  });

  it('falls back to a numeric offset header', async () => {
    const req = mockReq({ headers: { 'x-timezone-offset': '-330' } });

    await flashcardController.reviewFlashcard(req, mockRes(), vi.fn());

    expect(updateStreak).toHaveBeenCalledWith('user-1', -330);
    expect(checkAndUnlockBadges.mock.calls[0][2]).toEqual({ timezoneOffsetMinutes: -330 });
  });

  it('attaches unlocked badges to the progression payload', async () => {
    checkAndUnlockBadges.mockResolvedValue([{ id: 'badge-1' }]);
    const res = mockRes();

    await flashcardController.reviewFlashcard(mockReq(), res, vi.fn());

    expect(res.payload.data).toBeDefined();
    expect(res.payload.progression.newBadges).toEqual([{ id: 'badge-1' }]);
  });

  it('returns the updated card on success', async () => {
    const res = mockRes();

    await flashcardController.reviewFlashcard(mockReq(), res, vi.fn());

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.id).toBe('card-1');
  });

  it('forwards an unexpected failure to next()', async () => {
    const failure = new Error('connection terminated');
    findOne.mockRejectedValue(failure);
    const next = vi.fn();

    await flashcardController.reviewFlashcard(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});

describe('the routers this controller unblocked', () => {
  const ROUTES_DIR = path.join(__dirname, '..', '..', 'routes');

  /** Handler names a router destructures out of flashcardController. */
  function importedHandlers(routerFile) {
    const source = fs.readFileSync(path.join(ROUTES_DIR, routerFile), 'utf8');
    const match = source.match(
      /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\('\.\.\/controllers\/flashcardController'\)/
    );

    if (!match) return [];

    return match[1]
      .split(',')
      .map((part) => part.split(':').pop().trim())
      .filter(Boolean);
  }

  // flashcardRoutes imports the handlers directly; communityRoutes reaches the
  // controller transitively. Both failed to mount while it did not parse, so
  // every flashcard and community endpoint 404'd.
  it.each(['flashcardRoutes', 'communityRoutes'])('%s loads', (router) => {
    expect(() => require(`../../routes/${router}`)).not.toThrow();
  });

  it.each(['flashcardRoutes', 'communityRoutes'])('%s mounts an Express router', (router) => {
    const mounted = require(`../../routes/${router}`);

    expect(typeof mounted).toBe('function');
    expect(mounted.stack.length).toBeGreaterThan(0);
  });

  it('finds the handler list flashcardRoutes imports', () => {
    // Guards the scan itself: if the import shape changes, the assertion below
    // would pass over an empty list.
    expect(importedHandlers('flashcardRoutes.js').length).toBeGreaterThan(10);
  });

  it('defines every handler flashcardRoutes imports', () => {
    // While the module failed to parse every one of these was undefined, which
    // is the `Route.get() requires a callback function` class of boot failure.
    const undefinedHandlers = importedHandlers('flashcardRoutes.js').filter(
      (name) => typeof flashcardController[name] !== 'function'
    );

    expect(undefinedHandlers).toEqual([]);
  });

  it('mounts the review route on the handler this fix restored', () => {
    const routes = fs.readFileSync(path.join(ROUTES_DIR, 'flashcardRoutes.js'), 'utf8');

    expect(routes).toMatch(/router\.put\('\/:id\/review'[^)]*reviewFlashcard\)/);
    expect(typeof flashcardController.reviewFlashcard).toBe('function');
  });

  it('registers the review route on the mounted router', () => {
    const router = require('../../routes/flashcardRoutes');

    const reviewLayer = router.stack.find((layer) => layer.route?.path === '/:id/review');

    expect(reviewLayer).toBeDefined();
    expect(reviewLayer.route.methods.put).toBe(true);
  });

  it('gives every registered route at least one handler', () => {
    // An undefined import reaches Express as a missing callback, so a route
    // with an empty stack is the same defect one layer down.
    const router = require('../../routes/flashcardRoutes');

    const empty = router.stack
      .filter((layer) => layer.route)
      .filter((layer) => layer.route.stack.length === 0)
      .map((layer) => layer.route.path);

    expect(empty).toEqual([]);
  });

  it('has no undefined handler in any route stack', () => {
    const router = require('../../routes/flashcardRoutes');

    const broken = router.stack
      .filter((layer) => layer.route)
      .filter((layer) => layer.route.stack.some((entry) => typeof entry.handle !== 'function'))
      .map((layer) => layer.route.path);

    expect(broken).toEqual([]);
  });
});
