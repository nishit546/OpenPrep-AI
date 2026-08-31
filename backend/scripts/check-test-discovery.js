#!/usr/bin/env node
/**
 * Reports test files that neither runner picks up.
 *
 * The backend has two runners with two non-overlapping globs:
 *
 *   vitest  vitest.config.unit.js  include: ['tests/**\/*.unit.test.js']
 *   jest    jest.config.js         testMatch: ['**\/tests/integration/**\/*.test.js']
 *
 * A file named `foo.test.js` outside `tests/integration/` matches neither. It
 * is never executed by `npm test`, `npm run test:unit`, `npm run test:coverage`
 * or `npm run test:integration`, and nothing anywhere says so — the suite
 * reports a healthy pass count and the file is simply not in it.
 *
 * 94 files under backend/tests are in that state. `tests/studyAnalyticsService.test.js`
 * was one of them, and when it was renamed into the vitest glob it immediately
 * failed on a real timezone defect in the service's period helpers that had
 * been in main the whole time.
 *
 *   node scripts/check-test-discovery.js
 *
 * Exits non-zero on any file that matches neither glob and is not in
 * tests/orphaned-tests.json. That file is a ceiling: it stops the backlog
 * growing while it is worked through.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const TESTS_DIR = path.join(BACKEND_ROOT, 'tests');
const ALLOWLIST_PATH = path.join(TESTS_DIR, 'orphaned-tests.json');

/** Mirrors vitest.config.unit.js `include`. */
const VITEST_PATTERN = /\.unit\.test\.js$/;

/** Mirrors jest.config.js `testMatch`. */
const JEST_PATTERN = /(^|\/)tests\/integration\/.*\.test\.js$/;

/** Every *.test.js under backend/tests, as paths relative to backend/. */
function testFiles(dir = TESTS_DIR, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      testFiles(full, found);
    } else if (entry.name.endsWith('.test.js')) {
      found.push(path.relative(BACKEND_ROOT, full).split(path.sep).join('/'));
    }
  }

  return found.sort();
}

/** Which runner, if any, executes a given file. */
function runnerFor(file) {
  if (JEST_PATTERN.test(file)) return 'jest';
  if (VITEST_PATTERN.test(file)) return 'vitest';
  return null;
}

function allowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return { orphanedTests: [] };

  return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
}

/**
 * Groups every test file by the runner that executes it.
 *
 * Exported so the vitest gate asserts on the same data rather than
 * reimplementing the globs and drifting from the configs they mirror.
 */
function auditTestDiscovery() {
  const files = testFiles();
  const known = new Set(allowlist().orphanedTests || []);

  const byRunner = { vitest: [], jest: [], none: [] };
  for (const file of files) {
    byRunner[runnerFor(file) || 'none'].push(file);
  }

  const undiscovered = byRunner.none.filter((file) => !known.has(file));
  const staleAllowlist = [...known].filter((file) => !byRunner.none.includes(file));

  return {
    files,
    byRunner,
    allowlisted: [...known].sort(),
    findings: {
      'is picked up by no runner': undiscovered,
      'is allowlisted but no longer orphaned or no longer present': staleAllowlist.sort(),
    },
  };
}

function main() {
  const { files, byRunner, allowlisted, findings } = auditTestDiscovery();
  const failed = Object.entries(findings).filter(([, entries]) => entries.length > 0);

  console.log(
    `Test discovery audit — ${files.length} test files: ` +
      `${byRunner.vitest.length} vitest, ${byRunner.jest.length} jest, ` +
      `${byRunner.none.length} picked up by neither.`
  );

  if (allowlisted.length) {
    console.log(
      `\n  note: ${allowlisted.length} file(s) are allowlisted in tests/orphaned-tests.json` +
        '\n  as known debt. They are not executed by any runner.'
    );
  }

  if (!failed.length) {
    console.log('\nOK — every test file outside the allowlist is picked up by a runner.');
    return 0;
  }

  for (const [check, entries] of failed) {
    console.error(`\nA test file ${check}:`);
    for (const entry of entries) console.error(`  - ${entry}`);
  }

  console.error(
    '\nRename a unit test to *.unit.test.js, or move an integration test under' +
      '\ntests/integration/. See docs/backend-test-discovery.md.'
  );

  return 1;
}

module.exports = {
  auditTestDiscovery,
  testFiles,
  runnerFor,
  allowlist,
  VITEST_PATTERN,
  JEST_PATTERN,
  ALLOWLIST_PATH,
  TESTS_DIR,
};

if (require.main === module) {
  process.exit(main());
}
