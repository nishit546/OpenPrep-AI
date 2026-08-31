import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const {
  auditServerWiring,
  mergeResidue,
  topLevelDeclarations,
  boundIdentifiers,
  mounts,
  requiredRouters,
  usedHandlers,
  unreferencedRouteFiles,
  allowlist,
  SERVER_PATH,
  ALLOWLIST_PATH,
} = require('../../scripts/check-server-wiring');

/**
 * server.js is the one file in the backend that nothing loads in a test, and
 * it accumulated five separate defects behind that gap:
 *
 *   - `examStrategyRoutes` and `studyTipRoutes` were each declared twice, at
 *     lines 114-115 and again at 477-478. That is a SyntaxError, so the file
 *     did not parse and `npm start` could not reach the first line of it.
 *   - two lines of stripped merge residue, ` feat/omr-pdf-generator` at line 98
 *     and ` main` at 119. The conflict markers had been deleted but the branch
 *     names they carried were left as bare source lines. `grep '<<<<<<<'`
 *     finds nothing; both parse as expression statements and throw
 *     ReferenceError the moment they run.
 *   - `molecularRoutes` mounted at `/api/molecular` with no require anywhere in
 *     the file — `ReferenceError: molecularRoutes is not defined`.
 *   - `./routes/studyPlaylistRoutes` required for a feature whose PR was never
 *     merged. There is no such module, no controller and no model.
 *   - `/api/bounties` mounted twice, and `learningPathRoutes` required inline
 *     at each of its two mount paths.
 *
 * The audit these assertions run is the same one
 * scripts/check-server-wiring.js prints, so the shell report and the gate
 * cannot drift apart.
 */

const SOURCE = fs.readFileSync(SERVER_PATH, 'utf8');
const FINDINGS = auditServerWiring();

describe('the wiring audit is looking at something', () => {
  it('finds the routers server.js requires', () => {
    // A parsing change that silently matched nothing would make every
    // assertion below vacuously true.
    expect(requiredRouters(SOURCE).size).toBeGreaterThan(50);
  });

  it('finds the app.use mounts', () => {
    expect(mounts(SOURCE).length).toBeGreaterThan(50);
  });

  it('finds the identifiers server.js binds', () => {
    expect(boundIdentifiers(SOURCE).size).toBeGreaterThan(50);
  });

  it('finds the handlers server.js uses', () => {
    expect(usedHandlers(SOURCE).size).toBeGreaterThan(50);
  });
});

describe('server.js passes every wiring check', () => {
  for (const [check, entries] of Object.entries(FINDINGS)) {
    it(`never ${check}`, () => {
      expect(entries).toEqual([]);
    });
  }
});

describe('the specific defects this fix removes', () => {
  it('parses', () => {
    // The headline symptom: `node --check server.js` failed, so nothing in the
    // backend could start.
    expect(FINDINGS['does not parse']).toEqual([]);
  });

  it('declares examStrategyRoutes and studyTipRoutes exactly once each', () => {
    const declarations = topLevelDeclarations(SOURCE);

    expect(declarations.get('examStrategyRoutes')).toHaveLength(1);
    expect(declarations.get('studyTipRoutes')).toHaveLength(1);
  });

  it('carries no branch label left behind by a stripped conflict', () => {
    expect(mergeResidue(SOURCE)).toEqual([]);
  });

  it('binds molecularRoutes before mounting it', () => {
    expect(boundIdentifiers(SOURCE).has('molecularRoutes')).toBe(true);
    expect(SOURCE).toContain("app.use('/api/molecular', molecularRoutes);");
  });

  it('no longer references the study playlist router that was never merged', () => {
    // routes/, controllers/, services/ and models/ have nothing by this name —
    // PR #1988 is still open.
    expect(SOURCE).not.toContain('studyPlaylistRoutes');
    expect(fs.existsSync(path.join(path.dirname(SERVER_PATH), 'routes', 'studyPlaylistRoutes.js'))).toBe(false);
  });

  it('mounts /api/bounties once', () => {
    const bountyMounts = mounts(SOURCE).filter(({ mountPath }) => mountPath === '/api/bounties');

    expect(bountyMounts).toHaveLength(1);
  });

  it('binds learningPathRoutes once and aliases it, rather than requiring it twice', () => {
    const learningPathMounts = mounts(SOURCE).filter(({ mountPath }) =>
      mountPath.endsWith('/learning-path')
    );

    expect(learningPathMounts).toHaveLength(2);
    expect(learningPathMounts.every(({ handler }) => handler === 'learningPathRoutes')).toBe(true);
  });
});

describe('every route file server.js names exists and every router it binds is used', () => {
  it('requires no missing route module', () => {
    const missing = [];

    for (const match of SOURCE.matchAll(/require\('\.\/(routes\/[A-Za-z0-9_.-]+)'\)/g)) {
      const target = path.join(path.dirname(SERVER_PATH), `${match[1]}.js`);
      if (!fs.existsSync(target)) missing.push(match[1]);
    }

    expect(missing).toEqual([]);
  });

  it('mounts every router it requires, except the allowlisted backlog', () => {
    const known = new Set(allowlist().unmountedRouters);
    const used = usedHandlers(SOURCE);

    const unmounted = [...requiredRouters(SOURCE).keys()]
      .filter((identifier) => !used.has(identifier))
      .filter((identifier) => !known.has(identifier));

    expect(unmounted).toEqual([]);
  });
});

describe('the unmounted-router allowlist', () => {
  const known = allowlist().unmountedRouters;

  it('is a ceiling, not a target — every entry is still unmounted', () => {
    // An entry that has since been mounted should be deleted, so the list
    // keeps shrinking instead of quietly permitting a re-break.
    const used = usedHandlers(SOURCE);
    const stale = known.filter((identifier) => used.has(identifier));

    expect(stale).toEqual([]);
  });

  it('names only routers server.js actually requires', () => {
    const required = requiredRouters(SOURCE);
    const unknown = known.filter((identifier) => !required.has(identifier));

    expect(unknown).toEqual([]);
  });

  it('names a route file that exists for every entry', () => {
    const required = requiredRouters(SOURCE);

    const missing = known.filter(
      (identifier) => !fs.existsSync(path.join(path.dirname(SERVER_PATH), `${required.get(identifier)}.js`))
    );

    expect(missing).toEqual([]);
  });

  it('explains itself in the file', () => {
    // The list is only defensible while it says why each router is not
    // mounted; without that it reads as a permanent exemption.
    const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

    expect(Array.isArray(raw._comment)).toBe(true);
    expect(raw._comment.join(' ')).toMatch(/404/);
  });
});

/**
 * Seeds a defect into the source and asserts the audit reports it.
 *
 * Passed as a string rather than written to disk: the auditor takes an
 * optional source override precisely so this cannot leave a mutated server.js
 * behind if an assertion throws. The one check that needs the real file —
 * `node --check` — is skipped under an override and covered separately.
 */
const seed = (mutate) => auditServerWiring(mutate(SOURCE));
const findingsFor = (findings) => Object.values(findings).flat().join('\n');

describe('the audit detects the defects it exists to catch', () => {
  it('reports a duplicate top-level declaration', () => {
    const findings = seed((source) =>
      source.replace(
        "const badgeRoutes = require('./routes/badgeRoutes');",
        "const badgeRoutes = require('./routes/badgeRoutes');\nconst badgeRoutes = require('./routes/badgeRoutes');"
      )
    );

    expect(findingsFor(findings)).toContain('badgeRoutes declared at lines');
  });

  it('reports a stripped branch-label line', () => {
    const findings = seed((source) =>
      source.replace(
        "const badgeRoutes = require('./routes/badgeRoutes');",
        "const badgeRoutes = require('./routes/badgeRoutes');\n feat/omr-pdf-generator"
      )
    );

    expect(findingsFor(findings)).toContain('feat/omr-pdf-generator');
  });

  it('reports a bare `main` left behind by a conflict', () => {
    const findings = seed((source) =>
      source.replace(
        "const badgeRoutes = require('./routes/badgeRoutes');",
        "const badgeRoutes = require('./routes/badgeRoutes');\n main"
      )
    );

    expect(findingsFor(findings)).toContain('stripped merge residue: main');
  });

  it('reports a real conflict marker too', () => {
    const findings = seed((source) => `${source}\n<<<<<<< HEAD\n`);

    expect(findingsFor(findings)).toContain('conflict marker');
  });

  it('reports a mount whose handler is never bound', () => {
    const findings = seed((source) =>
      source.replace("const molecularRoutes = require('./routes/molecularRoutes');\n", '')
    );

    expect(findings['mounts an identifier it never binds']).toContain(
      "app.use('/api/molecular', molecularRoutes) — molecularRoutes is never bound"
    );
  });

  it('reports a require of a route file that does not exist', () => {
    const findings = seed((source) =>
      source.replace(
        "const badgeRoutes = require('./routes/badgeRoutes');",
        "const badgeRoutes = require('./routes/studyPlaylistRoutes');"
      )
    );

    expect(findings['requires a route file that does not exist']).toContain(
      './routes/studyPlaylistRoutes does not exist'
    );
  });

  it('reports the same route file required twice', () => {
    const findings = seed((source) =>
      source.replace(
        "const badgeRoutes = require('./routes/badgeRoutes');",
        "const badgeRoutes = require('./routes/badgeRoutes');\nconst badgeRoutesAgain = require('./routes/badgeRoutes');"
      )
    );

    expect(findings['requires the same route file more than once']).toContain(
      './routes/badgeRoutes is required 2 times'
    );
  });

  it('reports two routers mounted on the same path', () => {
    const findings = seed((source) =>
      source.replace(
        "app.use('/api/badges', badgeRoutes);",
        "app.use('/api/badges', badgeRoutes);\napp.use('/api/badges', molecularRoutes);"
      )
    );

    expect(findingsFor(findings)).toContain("'/api/badges' is mounted 2 times");
  });

  it('reports a router required and never mounted', () => {
    const findings = seed((source) =>
      source.replace("app.use('/api/badges', badgeRoutes);\n", '')
    );

    expect(findings['requires a router it never mounts']).toContain('badgeRoutes');
  });

  it('does not flag a rate limiter sharing a prefix with its router', () => {
    // `/api/auth` carries authRateLimiter and authRoutes on purpose.
    expect(findingsFor(auditServerWiring(SOURCE))).not.toContain("'/api/auth' is mounted");
  });

  it('leaves server.js untouched', () => {
    expect(fs.readFileSync(SERVER_PATH, 'utf8')).toBe(SOURCE);
  });
});

describe('route files that server.js never references', () => {
  it('is reported rather than enforced', () => {
    // Sixty-odd route files are not referenced at all. Each is a feature that
    // was written and never wired, which is a backlog rather than a
    // regression, so it is surfaced and not failed on.
    const unreferenced = unreferencedRouteFiles();

    expect(Array.isArray(unreferenced)).toBe(true);
    expect(unreferenced).not.toContain('authRoutes.js');
    expect(unreferenced).not.toContain('quizRoutes.js');
  });
});
