# Backend test discovery

The backend runs **two** test runners, with two globs that do not overlap:

| Runner | Config | Glob | Command |
| --- | --- | --- | --- |
| vitest | `vitest.config.unit.js` | `tests/**/*.unit.test.js` | `npm test`, `npm run test:unit`, `npm run test:coverage` |
| jest | `jest.config.js` | `**/tests/integration/**/*.test.js` | `npm run test:jest`, `npm run test:integration` |

A file named `foo.test.js` that is **not** under `tests/integration/` matches
neither. It is never executed by any command, and **nothing reports that** —
the suite prints a healthy pass count and the file simply is not in it.

94 files under `backend/tests` are in that state.

## Why this matters

These are not dead tests. They are tests someone wrote that have never
protected anything.

`tests/studyAnalyticsService.test.js` was one of them. Renaming it into the
vitest glob made it fail on its very first run, on a real defect that had been
in `main` the whole time:

```
AssertionError: expected '2026-07-31' to match /^2026-08-01/
  getMonthPeriod → periodStart
```

`getWeekPeriod`, `getMonthPeriod` and `getDayPeriod` built their boundaries in
local time and serialised them with `toISOString()`, which converts to UTC
first. Local midnight on 1 August in IST (UTC+5:30) is `2026-07-31T18:30:00Z`,
so August was labelled as starting on 31 July — every analytics snapshot period
was off by one day for the majority of this app's users. The test that caught it
had been sitting in the repo, passing nowhere, since the service was written.

## Naming a test so it runs

**Unit test** — no database, or one it sets up itself:

```
backend/tests/unit/yourService.unit.test.js
backend/tests/services/yourService.unit.test.js
```

Anything ending `.unit.test.js` anywhere under `tests/` is picked up by vitest.

**Integration test** — needs a live PostgreSQL and the app wired together:

```
backend/tests/integration/yourFeature.test.js
```

Jest owns `tests/integration/` entirely, so files there use the plain
`.test.js` suffix.

A file matching both globs (`tests/integration/x.unit.test.js`) is executed by
jest, since jest owns the directory. Prefer not to write one.

## The checker

```bash
cd backend
node scripts/check-test-discovery.js
```

It walks `backend/tests`, buckets every `*.test.js` by the runner that would
execute it, and fails on any file that matches neither glob and is not
allowlisted. It runs in the `test-backend` CI job, immediately before the suite
itself.

```
Test discovery audit — 300 test files: 202 vitest, 4 jest, 94 picked up by neither.

  note: 94 file(s) are allowlisted in tests/orphaned-tests.json
  as known debt. They are not executed by any runner.

OK — every test file outside the allowlist is picked up by a runner.
```

## The orphan allowlist

`backend/tests/orphaned-tests.json` lists the 94 files that no runner executes
today.

They are listed rather than renamed in bulk because bringing 94 suites into CI
at once means triaging whatever they find, and most of them need a live
PostgreSQL. Renaming them without reading them would either turn CI red or —
worse — tempt someone to delete the ones that fail. They are worth reading:
the one that has been brought in so far found a real bug on its first run.

The list is a **ceiling, not a target**:

- the checker fails on any *new* test file that matches neither glob;
- it also fails on an entry that has since been renamed into a glob or deleted,
  so the list has to shrink rather than drift.

To bring one in: rename it per the section above, run it, fix what it finds,
and delete its line from `orphanedTests`.

## Related gates

- `tests/integrity/testDiscovery.unit.test.js` — runs the audit, checks the
  patterns still match the runner configs they mirror, and seeds new
  undiscovered files to prove the audit still detects them.
- `docs/model-registry.md`, `docs/server-boot-path.md` — the other two
  "this was never checked" gates in the backend.
