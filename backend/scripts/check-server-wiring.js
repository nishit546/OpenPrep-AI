#!/usr/bin/env node
/**
 * Static audit of backend/server.js.
 *
 * server.js is 800 lines of requires and `app.use` calls that no test ever
 * loaded, and it has picked up damage from merges that nothing caught:
 *
 *   - two lines of stripped merge residue — the conflict markers were deleted
 *     but the branch names they carried were left as bare source lines, which
 *     parse fine as expression statements and throw at boot;
 *   - `examStrategyRoutes` and `studyTipRoutes` declared twice, which is a
 *     SyntaxError, so the file did not parse at all;
 *   - `molecularRoutes` mounted with no require anywhere in the file;
 *   - `./routes/studyPlaylistRoutes` required for a feature that was never
 *     merged, so the module does not exist;
 *   - ten routers required and then never mounted, so ten route files are
 *     unreachable.
 *
 * Every one of those is invisible in a diff and fatal (or silently
 * feature-removing) at boot. This reads the file as text and needs no
 * database, no Redis and no successful boot, so it can gate a pull request.
 *
 *   node scripts/check-server-wiring.js
 *
 * Exits non-zero on any finding. The equivalent assertions run as
 * tests/integrity/serverWiring.unit.test.js.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BACKEND_ROOT = path.join(__dirname, '..');
const SERVER_PATH = path.join(BACKEND_ROOT, 'server.js');
const ROUTES_DIR = path.join(BACKEND_ROOT, 'routes');
const ALLOWLIST_PATH = path.join(__dirname, 'server-wiring-allowlist.json');

/**
 * Identifiers Node defines, plus the ones server.js legitimately shadows in a
 * nested scope. Only top-level declarations are collected, so this stays short.
 */
const RESIDUE_IGNORE = new Set(['main', 'master', 'develop']);

const read = () => fs.readFileSync(SERVER_PATH, 'utf8');

/**
 * Lines that look like a branch name left behind by a conflict resolved by
 * deleting the markers rather than choosing a side.
 *
 * A plain grep for '<<<<<<<' finds nothing here: the residue is a bare
 * identifier or a slash-separated path on its own line, which parses as an
 * expression statement and only throws once it runs.
 */
function mergeResidue(source) {
  const findings = [];

  source.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/^(?:<{7}|={7}|>{7})/.test(trimmed)) {
      findings.push(`server.js:${index + 1}: conflict marker: ${trimmed}`);
      return;
    }

    // ` feat/omr-pdf-generator` and ` main` — a leading space, no statement
    // punctuation, and a shape that only ever appears as a branch label.
    if (!/^\s/.test(line)) return;
    if (/[;={}()[\],:'"`]/.test(trimmed)) return;
    if (/^(?:\/\/|\/\*|\*)/.test(trimmed)) return;

    const isBranchPath = /^[a-z][\w.-]*\/[\w./-]+$/.test(trimmed);
    const isBranchName = RESIDUE_IGNORE.has(trimmed);

    if (isBranchPath || isBranchName) {
      findings.push(`server.js:${index + 1}: stripped merge residue: ${trimmed}`);
    }
  });

  return findings;
}

/** Top-level `const`/`let`/`var` names, with the lines they were declared on. */
function topLevelDeclarations(source) {
  const declarations = new Map();

  source.split('\n').forEach((line, index) => {
    // Top level only: an indented declaration is inside a function or block.
    const match = line.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
    if (!match) return;

    if (!declarations.has(match[1])) declarations.set(match[1], []);
    declarations.get(match[1]).push(index + 1);
  });

  return declarations;
}

/** Every identifier server.js binds, at any indentation. */
function boundIdentifiers(source) {
  const bound = new Set();

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    bound.add(match[1]);
  }

  for (const match of source.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g)) {
    for (const part of match[1].split(',')) {
      const name = part.split(':').pop().trim();
      if (name) bound.add(name);
    }
  }

  for (const match of source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    bound.add(match[1]);
  }

  return bound;
}

/** `app.use('/path', handler)` pairs, with the handler as written. */
function mounts(source) {
  const found = [];

  for (const match of source.matchAll(/app\.use\(\s*'([^']+)'\s*,\s*([^),\n]+)\)/g)) {
    found.push({ mountPath: match[1], handler: match[2].trim() });
  }

  return found;
}

/** Route modules bound to an identifier, keyed by identifier. */
function requiredRouters(source) {
  const required = new Map();

  for (const match of source.matchAll(
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\('\.\/(routes\/[A-Za-z0-9_.-]+)'\)/g
  )) {
    required.set(match[1], match[2]);
  }

  return required;
}

/** Identifiers handed to app.use or to a verb route as a handler. */
function usedHandlers(source) {
  const used = new Set();

  for (const { handler } of mounts(source)) {
    if (/^[A-Za-z_$][\w$]*$/.test(handler)) used.add(handler);
  }

  for (const match of source.matchAll(
    /app\.(?:get|post|put|patch|delete|all)\(\s*(?:'[^']*'|\[[^\]]*\])\s*,\s*([^),\n]+)/g
  )) {
    for (const part of match[1].split(',')) {
      const name = part.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) used.add(name);
    }
  }

  return used;
}

/** Reads the allowlist of route modules known to be required but unmounted. */
function allowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return { unmountedRouters: [] };

  return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
}

/** True when `node --check` accepts the file. */
function parses() {
  try {
    execFileSync(process.execPath, ['--check', SERVER_PATH], { stdio: 'pipe' });
    return null;
  } catch (error) {
    return String(error.stderr || error.message)
      .split('\n')
      .find((line) => /Error/.test(line)) || 'did not parse';
  }
}

/**
 * Runs every check and returns findings grouped by what went wrong.
 *
 * Exported so the vitest gate asserts on the same data rather than growing a
 * second copy of this parsing that can drift.
 */
function auditServerWiring(sourceOverride) {
  const source = sourceOverride === undefined ? read() : sourceOverride;
  const bound = boundIdentifiers(source);
  const required = requiredRouters(source);
  const used = usedHandlers(source);
  const known = new Set(allowlist().unmountedRouters || []);

  const parseError = sourceOverride === undefined ? parses() : null;

  const duplicateDeclarations = [...topLevelDeclarations(source).entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([name, lines]) => `${name} declared at lines ${lines.join(', ')}`)
    .sort();

  const unboundMounts = mounts(source)
    .filter(({ handler }) => /^[A-Za-z_$][\w$]*$/.test(handler))
    .filter(({ handler }) => !bound.has(handler))
    .map(({ mountPath, handler }) => `app.use('${mountPath}', ${handler}) — ${handler} is never bound`)
    .sort();

  const missingRouteFiles = [];
  for (const match of source.matchAll(/require\('\.\/(routes\/[A-Za-z0-9_.-]+)'\)/g)) {
    const target = path.join(BACKEND_ROOT, `${match[1]}.js`);
    if (!fs.existsSync(target)) missingRouteFiles.push(`./${match[1]} does not exist`);
  }

  const duplicateRequires = [];
  const requireCounts = new Map();
  for (const match of source.matchAll(/require\('\.\/(routes\/[A-Za-z0-9_.-]+)'\)/g)) {
    requireCounts.set(match[1], (requireCounts.get(match[1]) || 0) + 1);
  }
  for (const [module, count] of requireCounts) {
    if (count > 1) duplicateRequires.push(`./${module} is required ${count} times`);
  }

  /**
   * The same path mounted twice. Express runs both layers, so the second is
   * either dead or a duplicated middleware pass. Rate limiters are mounted on
   * the same prefix as their router on purpose, so only router-to-router
   * collisions count.
   */
  const shadowedMounts = [];
  const byPath = new Map();
  for (const { mountPath, handler } of mounts(source)) {
    if (/Limiter|limiter/.test(handler)) continue;
    if (!byPath.has(mountPath)) byPath.set(mountPath, []);
    byPath.get(mountPath).push(handler);
  }
  for (const [mountPath, handlers] of byPath) {
    if (handlers.length > 1) {
      shadowedMounts.push(`'${mountPath}' is mounted ${handlers.length} times: ${handlers.join(', ')}`);
    }
  }

  const unmountedRouters = [...required.entries()]
    .filter(([identifier]) => !used.has(identifier))
    .map(([identifier]) => identifier)
    .filter((identifier) => !known.has(identifier))
    .sort();

  return {
    'does not parse': parseError ? [parseError] : [],
    'carries merge residue': mergeResidue(source),
    'declares a top-level name twice': duplicateDeclarations,
    'mounts an identifier it never binds': unboundMounts,
    'requires a route file that does not exist': missingRouteFiles,
    'requires the same route file more than once': duplicateRequires.sort(),
    'mounts two routers on the same path': shadowedMounts.sort(),
    'requires a router it never mounts': unmountedRouters,
  };
}

/** Route files on disk that server.js never requires — reported, never fatal. */
function unreferencedRouteFiles() {
  const source = read();

  return fs
    .readdirSync(ROUTES_DIR)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !source.includes(`routes/${path.basename(file, '.js')}'`))
    .sort();
}

function main() {
  const findings = auditServerWiring();
  const failed = Object.entries(findings).filter(([, entries]) => entries.length > 0);

  const source = read();
  console.log(
    `server.js wiring audit — ${requiredRouters(source).size} routers required, ` +
      `${mounts(source).length} app.use mounts, ${unreferencedRouteFiles().length} route files never referenced.`
  );

  const known = allowlist().unmountedRouters || [];
  if (known.length) {
    console.log(
      `\n  note: ${known.length} router(s) are required but not mounted and are` +
        '\n  allowlisted in scripts/server-wiring-allowlist.json as known debt:' +
        `\n    ${known.join(', ')}`
    );
  }

  if (!failed.length) {
    console.log('\nOK — server.js parses, binds every router it mounts, and mounts every router it binds.');
    return 0;
  }

  for (const [check, entries] of failed) {
    console.error(`\nserver.js ${check}:`);
    for (const entry of entries) console.error(`  - ${entry}`);
  }

  console.error(
    `\n${failed.reduce((total, [, entries]) => total + entries.length, 0)} problem(s) found.` +
      '\nSee docs/server-boot-path.md.'
  );

  return 1;
}

module.exports = {
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
};

if (require.main === module) {
  process.exit(main());
}
