import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const {
  auditTestDiscovery,
  testFiles,
  runnerFor,
  allowlist,
  VITEST_PATTERN,
  JEST_PATTERN,
  ALLOWLIST_PATH,
} = require('../../scripts/check-test-discovery');

/**
 * The backend runs two test runners with two non-overlapping globs, and a file
 * that matches neither is silently never executed:
 *
 *   vitest  vitest.config.unit.js   include:   ['tests/**\/*.unit.test.js']
 *   jest    jest.config.js          testMatch: ['**\/tests/integration/**\/*.test.js']
 *
 * 94 files under backend/tests are in that state. Nothing reported it: the
 * suite prints a healthy pass count and the file simply is not in it.
 *
 * tests/studyAnalyticsService.test.js was one of them. Renaming it into the
 * vitest glob made it fail on its first run, on a real timezone defect in
 * getWeekPeriod / getMonthPeriod / getDayPeriod that had been in main the whole
 * time. These were never dead tests — they were tests nobody was running.
 */

const AUDIT = auditTestDiscovery();

describe('the discovery audit mirrors the runner configs', () => {
  it('matches the vitest include glob', () => {
    const config = fs.readFileSync(
      path.join(__dirname, '..', '..', 'vitest.config.unit.js'),
      'utf8'
    );

    // If the config's glob changes, VITEST_PATTERN has to change with it or
    // this gate starts measuring something that is no longer true.
    expect(config).toContain("tests/**/*.unit.test.js");
    expect(VITEST_PATTERN.test('tests/unit/foo.unit.test.js')).toBe(true);
    expect(VITEST_PATTERN.test('tests/unit/foo.test.js')).toBe(false);
  });

  it('matches the jest testMatch glob', () => {
    const config = fs.readFileSync(path.join(__dirname, '..', '..', 'jest.config.js'), 'utf8');

    expect(config).toContain('tests/integration/**/*.test.js');
    expect(JEST_PATTERN.test('tests/integration/api.test.js')).toBe(true);
    expect(JEST_PATTERN.test('tests/integration/nested/api.test.js')).toBe(true);
    expect(JEST_PATTERN.test('tests/controllers/api.test.js')).toBe(false);
  });

  it('finds the test files on disk', () => {
    // A walk that silently returned nothing would make everything below
    // vacuously true.
    expect(testFiles().length).toBeGreaterThan(200);
  });

  it('assigns every file to exactly one bucket', () => {
    const { files, byRunner } = AUDIT;

    expect(byRunner.vitest.length + byRunner.jest.length + byRunner.none.length).toBe(files.length);
  });

  it('prefers jest for a file that would match both globs', () => {
    // tests/integration/x.unit.test.js matches vitest's suffix and jest's
    // directory. Jest owns tests/integration, so it must win, or the file
    // would be reported under a runner that is not the one executing it.
    expect(runnerFor('tests/integration/x.unit.test.js')).toBe('jest');
  });
});

describe('no test file is invisible to both runners', () => {
  for (const [check, entries] of Object.entries(AUDIT.findings)) {
    it(`no file ${check}`, () => {
      expect(entries).toEqual([]);
    });
  }
});

describe('the study analytics test this fix brought in', () => {
  const RENAMED = 'tests/unit/studyAnalyticsService.unit.test.js';

  it('is on disk under a name a runner picks up', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'unit', 'studyAnalyticsService.unit.test.js'))).toBe(
      true
    );
    expect(runnerFor(RENAMED)).toBe('vitest');
  });

  it('is not in the orphan allowlist', () => {
    expect(allowlist().orphanedTests).not.toContain(RENAMED);
    expect(allowlist().orphanedTests).not.toContain('tests/studyAnalyticsService.test.js');
  });

  it('is gone from its old, undiscovered path', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'studyAnalyticsService.test.js'))).toBe(false);
  });
});

describe('the orphan allowlist', () => {
  const known = allowlist().orphanedTests;

  it('names a file that still exists for every entry', () => {
    const missing = known.filter(
      (file) => !fs.existsSync(path.join(__dirname, '..', '..', file))
    );

    expect(missing).toEqual([]);
  });

  it('names only files that are genuinely picked up by no runner', () => {
    // An entry that has since been renamed into a glob should be deleted, so
    // the list shrinks rather than quietly permitting a re-break.
    const stale = known.filter((file) => runnerFor(file) !== null);

    expect(stale).toEqual([]);
  });

  it('holds no duplicates', () => {
    expect(new Set(known).size).toBe(known.length);
  });

  it('is sorted, so a diff against it reads cleanly', () => {
    expect(known).toEqual([...known].sort());
  });

  it('explains why the entries are listed rather than renamed', () => {
    // The list is only defensible while it says why; without that it reads as
    // a permanent exemption.
    const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));

    expect(Array.isArray(raw._comment)).toBe(true);
    expect(raw._comment.join(' ')).toMatch(/ceiling, not a target/);
  });

  it('is not growing — this is the count at the time of the fix', () => {
    // Deliberately an upper bound rather than an equality, so bringing a suite
    // in does not fail this test. Adding one does.
    expect(known.length).toBeLessThanOrEqual(94);
  });
});

/** Runs the audit against a synthetic file list to prove it still detects. */
function auditWith(extraFiles, extraAllowlist = []) {
  const known = new Set([...allowlist().orphanedTests, ...extraAllowlist]);
  const files = [...AUDIT.files, ...extraFiles];

  const none = files.filter((file) => runnerFor(file) === null);

  return {
    undiscovered: none.filter((file) => !known.has(file)),
    stale: [...known].filter((file) => !none.includes(file)),
  };
}

describe('the audit detects the defect it exists to catch', () => {
  it('reports a new unit test named without the .unit suffix', () => {
    const { undiscovered } = auditWith(['tests/services/brandNewService.test.js']);

    expect(undiscovered).toContain('tests/services/brandNewService.test.js');
  });

  it('reports a new test at the top of tests/', () => {
    const { undiscovered } = auditWith(['tests/somethingNew.test.js']);

    expect(undiscovered).toContain('tests/somethingNew.test.js');
  });

  it('accepts a new test that matches the vitest glob', () => {
    const { undiscovered } = auditWith(['tests/services/brandNewService.unit.test.js']);

    expect(undiscovered).toEqual([]);
  });

  it('accepts a new test placed under tests/integration', () => {
    const { undiscovered } = auditWith(['tests/integration/brandNew.test.js']);

    expect(undiscovered).toEqual([]);
  });

  it('reports an allowlist entry for a file that is no longer orphaned', () => {
    const { stale } = auditWith([], ['tests/unit/alreadyWiredUp.unit.test.js']);

    expect(stale).toContain('tests/unit/alreadyWiredUp.unit.test.js');
  });

  it('does not fire on the current tree', () => {
    const { undiscovered, stale } = auditWith([]);

    expect(undiscovered).toEqual([]);
    expect(stale).toEqual([]);
  });
});
