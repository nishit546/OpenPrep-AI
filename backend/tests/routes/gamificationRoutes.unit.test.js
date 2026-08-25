import { describe, it, expect, beforeEach, vi } from 'vitest';

const fs = require('fs');
const path = require('path');

const ROUTES_PATH = path.join(__dirname, '..', '..', 'routes', 'gamificationRoutes.js');
const ROUTES_SOURCE = fs.readFileSync(ROUTES_PATH, 'utf8');

/**
 * Flattens an Express router's stack into { method, path, middleware[] }.
 *
 * Middleware is compared by function identity rather than by `name`, because
 * `exports.protect = async (...) => {}` leaves the arrow anonymous.
 */
function describeRoutes(router) {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
      middleware: layer.route.stack.map((entry) => entry.handle),
    }));
}

/** Middleware mounted with router.use(), i.e. applying to every route. */
function routerLevelMiddleware(router) {
  return router.stack.filter((layer) => !layer.route).map((layer) => layer.handle);
}

describe('gamificationRoutes module', () => {
  it('parses and loads', () => {
    expect(() => require('../../routes/gamificationRoutes')).not.toThrow();
  });

  it('exports a single Express router', () => {
    const router = require('../../routes/gamificationRoutes');
    expect(typeof router).toBe('function');
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it('declares express and router exactly once each', () => {
    // The file previously held two whole router modules concatenated together,
    // which is why it died with "Identifier 'express' has already been declared".
    for (const identifier of ['express', 'router']) {
      const declarations = ROUTES_SOURCE.match(
        new RegExp(`^\\s*const ${identifier}\\b`, 'gm')
      );
      expect(declarations, `${identifier} declarations`).toHaveLength(1);
    }
  });

  it('assigns module.exports exactly once', () => {
    expect(ROUTES_SOURCE.match(/^module\.exports\b/gm)).toHaveLength(1);
  });

  it('has no duplicate top-level const declarations', () => {
    const names = [...ROUTES_SOURCE.matchAll(/^const\s+(?:\{[^}]*\}|(\w+))\s*=/gm)]
      .map((match) => match[1])
      .filter(Boolean);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

    expect(duplicates).toEqual([]);
  });
});

describe('gamification route registration', () => {
  it('registers every documented route', () => {
    const routes = describeRoutes(require('../../routes/gamificationRoutes'));
    const registered = routes.map((route) => `${route.method.toUpperCase()} ${route.path}`).sort();

    expect(registered).toEqual([
      'GET /status',
      'GET /summary',
      'POST /streak-freeze/buy',
      'POST /streak-freeze/use',
    ]);
  });

  it('registers each route exactly once', () => {
    const routes = describeRoutes(require('../../routes/gamificationRoutes'));
    const keys = routes.map((route) => `${route.method} ${route.path}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('binds every route to a real controller function', () => {
    const controller = require('../../controllers/gamificationController');
    const referenced = [
      'getGamificationStatus',
      'getSummary',
      'buyStreakFreeze',
      'useStreakFreeze',
    ];

    for (const name of referenced) {
      expect(typeof controller[name], `${name} is not exported`).toBe('function');
    }
  });
});

describe('gamification authentication coverage', () => {
  it('applies protect at the router level', () => {
    const { protect } = require('../../middleware/auth');
    const router = require('../../routes/gamificationRoutes');
    expect(routerLevelMiddleware(router)).toContain(protect);
  });

  it('leaves no route reachable without protect', () => {
    // Every handler here awards XP, spends a freeze, or reads another user's
    // progress. An unauthenticated route would have no req.user to scope to.
    const { protect } = require('../../middleware/auth');
    const router = require('../../routes/gamificationRoutes');
    const guardsEverything = routerLevelMiddleware(router).includes(protect);

    for (const route of describeRoutes(router)) {
      const guarded = guardsEverything || route.middleware.includes(protect);
      expect(guarded, `${route.method.toUpperCase()} ${route.path} is unguarded`).toBe(true);
    }
  });

  it('mounts protect before any route is registered', () => {
    const { protect } = require('../../middleware/auth');
    const router = require('../../routes/gamificationRoutes');
    const firstRouteIndex = router.stack.findIndex((layer) => layer.route);
    const protectIndex = router.stack.findIndex((layer) => layer.handle === protect);

    expect(protectIndex).toBeGreaterThanOrEqual(0);
    expect(protectIndex).toBeLessThan(firstRouteIndex);
  });
});

describe('restored gamification handlers', () => {
  const controller = require('../../controllers/gamificationController');
  const User = require('../../models/User');
  const UserBadge = require('../../models/UserBadge');

  let res;
  let next;

  function makeRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    res = makeRes();
    next = vi.fn();
  });

  describe('getSummary', () => {
    it('returns xp, level, streaks and badges for the caller', async () => {
      vi.spyOn(User, 'findByPk').mockResolvedValue({
        id: 'user-1',
        xp: 900,
        currentStreak: 6,
        longestStreak: 21,
        streakFreezes: 2,
      });
      vi.spyOn(UserBadge, 'findAll').mockResolvedValue([
        {
          id: 'ub-1',
          badgeCode: 'first-quiz',
          unlockedAt: '2026-08-01T00:00:00.000Z',
          badge: { name: 'First Quiz', description: 'Completed a quiz', svgIcon: '<svg/>' },
        },
      ]);

      await controller.getSummary({ user: { id: 'user-1' }, headers: {} }, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.xp).toBe(900);
      expect(res.body.data.currentStreak).toBe(6);
      expect(res.body.data.longestStreak).toBe(21);
      expect(res.body.data.streakFreezes).toBe(2);
      expect(res.body.data.badges).toHaveLength(1);
      expect(res.body.data.badges[0].title).toBe('First Quiz');
      expect(next).not.toHaveBeenCalled();
    });

    it('falls back to placeholder copy when the badge row has no joined badge', async () => {
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-1', xp: 0 });
      vi.spyOn(UserBadge, 'findAll').mockResolvedValue([
        { id: 'ub-2', badgeCode: 'orphan', unlockedAt: null, badge: null },
      ]);

      await controller.getSummary({ user: { id: 'user-1' }, headers: {} }, res, next);

      expect(res.body.data.badges[0].title).toBe('Achievement Unlocked');
      expect(res.body.data.badges[0].svgIcon).toBeNull();
    });

    it('returns 404 for an unknown user', async () => {
      vi.spyOn(User, 'findByPk').mockResolvedValue(null);

      await controller.getSummary({ user: { id: 'ghost' }, headers: {} }, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('forwards a lookup failure to the error middleware', async () => {
      const failure = new Error('connection terminated');
      vi.spyOn(User, 'findByPk').mockRejectedValue(failure);

      await controller.getSummary({ user: { id: 'user-1' }, headers: {} }, res, next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });

  describe('useStreakFreeze', () => {
    it('consumes one freeze and marks today active', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const user = { id: 'user-1', streakFreezes: 3, currentStreak: 9, save };
      vi.spyOn(User, 'findByPk').mockResolvedValue(user);

      await controller.useStreakFreeze(
        { user: { id: 'user-1' }, headers: { 'x-timezone': 'Asia/Kolkata' } },
        res,
        next
      );

      expect(user.streakFreezes).toBe(2);
      expect(user.lastActivityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(save).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.streakFreezes).toBe(2);
    });

    it('refuses when the caller has no freezes left', async () => {
      const save = vi.fn();
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-1', streakFreezes: 0, save });

      await controller.useStreakFreeze({ user: { id: 'user-1' }, headers: {} }, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No streak freezes available');
      expect(save).not.toHaveBeenCalled();
    });

    it('treats a missing streakFreezes column as zero rather than going negative', async () => {
      const save = vi.fn();
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-1', save });

      await controller.useStreakFreeze({ user: { id: 'user-1' }, headers: {} }, res, next);

      expect(res.statusCode).toBe(400);
      expect(save).not.toHaveBeenCalled();
    });

    it('resolves the date in the caller timezone, not the server timezone', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const user = { id: 'user-1', streakFreezes: 1, save };
      vi.spyOn(User, 'findByPk').mockResolvedValue(user);

      await controller.useStreakFreeze(
        { user: { id: 'user-1' }, headers: { 'x-timezone': 'Pacific/Kiritimati' } },
        res,
        next
      );

      const expected = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Kiritimati',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      expect(user.lastActivityDate).toBe(expected);
    });

    it('falls back to the numeric offset header when the zone name is unusable', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const user = { id: 'user-1', streakFreezes: 1, save };
      vi.spyOn(User, 'findByPk').mockResolvedValue(user);

      await controller.useStreakFreeze(
        {
          user: { id: 'user-1' },
          headers: { 'x-timezone': 'Not/AZone', 'x-timezone-offset': '-330' },
        },
        res,
        next
      );

      expect(user.lastActivityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 for an unknown user', async () => {
      vi.spyOn(User, 'findByPk').mockResolvedValue(null);

      await controller.useStreakFreeze({ user: { id: 'ghost' }, headers: {} }, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('forwards a save failure to the error middleware', async () => {
      const failure = new Error('deadlock detected');
      vi.spyOn(User, 'findByPk').mockResolvedValue({
        id: 'user-1',
        streakFreezes: 1,
        save: vi.fn().mockRejectedValue(failure),
      });

      await controller.useStreakFreeze({ user: { id: 'user-1' }, headers: {} }, res, next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });
});
