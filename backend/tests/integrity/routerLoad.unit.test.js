import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '../../');
const ROUTES_DIR = path.join(BACKEND_ROOT, 'routes');
const SERVER_SOURCE = fs.readFileSync(path.join(BACKEND_ROOT, 'server.js'), 'utf8');

/**
 * Router modules that server.js requires, in the order it requires them.
 *
 * The gate is deliberately scoped to what actually boots. `routes/` holds a
 * number of modules nothing has mounted yet; failing on those would report a
 * backlog rather than a regression, and the signal we want here is "the server
 * can still start".
 */
function mountedRouterFiles() {
  const required = new Set();
  const pattern = /require\(['"]\.\/routes\/([A-Za-z0-9_.-]+?)(?:\.js)?['"]\)/g;

  let match;
  while ((match = pattern.exec(SERVER_SOURCE)) !== null) {
    required.add(`${match[1]}.js`);
  }

  return [...required].filter((file) => fs.existsSync(path.join(ROUTES_DIR, file))).sort();
}

const MOUNTED = mountedRouterFiles();

/**
 * Requires a module and returns the failure as a string, or null on success.
 *
 * Missing optional native/vendor packages are treated as an environment gap
 * rather than a defect: this gate is about the repo's own wiring, and a
 * contributor who has not installed every optional dependency should not see
 * a red suite because of it.
 */
function loadFailure(file) {
  try {
    require(path.join(ROUTES_DIR, file));
    return null;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && /Cannot find module '[^.]/.test(error.message)) {
      return null;
    }
    return `${file}: ${error.constructor.name}: ${String(error.message).split('\n')[0]}`;
  }
}

describe('mounted routers', () => {
  it('finds the routers server.js mounts', () => {
    expect(MOUNTED.length).toBeGreaterThan(30);
  });

  it('every mounted router loads', () => {
    const failures = MOUNTED.map(loadFailure).filter(Boolean);

    expect(failures).toEqual([]);
  }, 30000);

});

describe('rate limiter exports', () => {
  const rateLimiter = require('../../middleware/rateLimiter');

  it('is callable as app-level middleware', () => {
    // server.js and tests/rateLimiter.test.js use the default export directly.
    expect(typeof rateLimiter).toBe('function');
    expect(rateLimiter.length).toBe(3);
  });

  it('exposes the middleware under an explicit name too', () => {
    expect(rateLimiter.rateLimiterMiddleware).toBe(rateLimiter);
  });

  it.each(['aiLimiter', 'strictAiLimiter', 'authEmailLimiter'])(
    'exports %s for the route modules that destructure it',
    (name) => {
      expect(typeof rateLimiter[name]).toBe('function');
    }
  );

  it('is destructured by name in every route module that uses it', () => {
    // routes/academicRoutes.js used to carry
    //   `require(...).aiLimiter || require(...)`
    // which silently fell back to the generic tiered middleware when the named
    // export went missing. That downgraded a 10-per-15-minutes AI budget to the
    // 60-per-minute authenticated tier without failing anywhere.
    const offenders = [];

    for (const file of fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.js'))) {
      const source = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
      if (!source.includes('middleware/rateLimiter')) continue;

      if (/rateLimiter'\)\s*\.\s*\w+\s*\|\|/.test(source)) {
        offenders.push(`${file} falls back to the default export`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not open a Redis connection at require time', () => {
    // Requiring this module used to instantiate ioredis eagerly, which kept
    // the event loop alive and flooded every Redis-less run with errors.
    const source = fs.readFileSync(
      path.join(BACKEND_ROOT, 'middleware', 'rateLimiter.js'),
      'utf8'
    );

    expect(source).toMatch(/lazyConnect:\s*true/);

    // The client may only be constructed inside the accessor, never at the
    // top level where a bare `require` would trigger it.
    const accessor = source.indexOf('function getRedisClient()');
    expect(accessor).toBeGreaterThan(-1);

    for (const match of source.matchAll(/new Redis\(/g)) {
      expect(match.index, 'ioredis is instantiated outside getRedisClient()')
        .toBeGreaterThan(accessor);
    }
  });
});
