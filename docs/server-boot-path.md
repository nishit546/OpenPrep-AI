# The server boot path

`backend/server.js` builds the Express app: middleware, then ~72 router
requires, then ~79 `app.use` mounts, then error handlers, then the Socket.IO
server and the graceful-shutdown hooks. It exports `app` and only calls
`server.listen` when `NODE_ENV !== 'test'` and `VERCEL` is unset.

It is also the one backend module that no test loads, which is how it reached
`main` in a state where `node --check server.js` failed.

## Why this file needs its own gate

Everything in `server.js` is a top-level statement, so a mistake anywhere in
the file takes down the whole process — and none of these show up as anything
useful in a diff:

| Mistake | What you actually see |
| --- | --- |
| The same `const` declared twice | `SyntaxError: Identifier 'x' has already been declared`. The file never parses, so `npm start` cannot reach its first line and no stack points at anything but the second declaration. |
| Stripped merge residue | A bare branch name on its own line — ` main`, ` feat/omr-pdf-generator`. It parses as an expression statement, so `node --check` accepts it, and it throws `ReferenceError` at boot. **`grep '<<<<<<<'` does not find it.** |
| A mount whose router is never required | `ReferenceError: molecularRoutes is not defined`, thrown while the mounts are being registered. |
| A `require` of a route file that does not exist | `Cannot find module './routes/studyPlaylistRoutes'` — usually a feature whose PR was never merged. |
| A router required and never mounted | Nothing at all. The module loads, the identifier sits unused, and **every endpoint in that route file 404s.** |
| The same path mounted twice | Nothing at all. Express runs both layers; the second is dead. |

The last two are the dangerous ones, because the server starts cleanly and the
feature is simply gone.

## The checker

```bash
cd backend
npm run check:server        # or: node scripts/check-server-wiring.js
```

It reads `server.js` as text plus a `node --check` parse. No database, no
Redis, no boot — so it runs in the `lint` job and gates a pull request before
anything tries to start. It reports:

- the file does not parse;
- conflict markers, or branch labels left behind by a conflict that was
  "resolved" by deleting the markers;
- a top-level name declared more than once;
- an `app.use` whose handler identifier is never bound;
- a `require('./routes/...')` with no file behind it;
- the same route file required more than once;
- two routers mounted on the same path (rate limiters sharing a prefix with
  their router are excluded — `/api/auth` carries both on purpose);
- a router required and never mounted, unless it is allowlisted.

Route files that `server.js` never references at all are printed as a count,
not failed on. Sixty-odd exist; each is a feature that was written and never
wired, which is a backlog rather than a regression.

## The unmounted-router allowlist

`backend/scripts/server-wiring-allowlist.json` names ten routers that
`server.js` requires and never mounts:

```
adaptivePlannerRoutes   attemptHistoryRoutes    learningInsightsRoutes
aiEditorRoutes          communityResourceRoutes pdfRoutes
proctoringRoutes        pyqIntelligenceRoutes   studyGoalSchedulerRoutes
weaknessDetectionRoutes
```

All ten were required in one block immediately after the stripped merge residue
at line 98 — the merge kept the requires from one side of the conflict and
dropped the mounts. Every endpoint in those ten files currently 404s.

They are allowlisted rather than mounted because **mounting a router changes
the public API surface**, and each needs its own review of the auth guards and
payload validation on its routes. That does not belong in a change whose job is
to make the file parse.

The list is a **ceiling, not a target**:

- the checker fails on any router required and left unmounted that is not named
  in it, so no new dead import can be added;
- a test asserts every entry is still genuinely unmounted, so an entry that has
  since been wired has to be deleted rather than left as a standing exemption.

Remove entries as the routers are reviewed and mounted.

## Adding a router

1. Add the route file under `backend/routes/`, guarded with
   `protect` from `middleware/auth` (**not** `middleware/authMiddleware`, which
   does not exist — see `docs/backend-architecture.md`).
2. Bind it with the other router requires near the top of `server.js`:
   `const yourRoutes = require('./routes/yourRoutes');`
3. Mount it in the mount block: `app.use('/api/your-thing', yourRoutes);`
4. Run `npm run check:server`.

Mount it in the same change that requires it. A require without a mount is a
feature that silently does not exist.

## Related gates

- `tests/integrity/serverWiring.unit.test.js` — runs the audit above, and seeds
  each defect into a copy of the source to prove the audit still detects it.
- `tests/integrity/serverRouterWiring.unit.test.js` — mounts reference bound
  identifiers; route modules resolve their middleware.
- `tests/integrity/routerLoad.unit.test.js` — every mounted router loads.
- `tests/integrity/moduleIntegrity.unit.test.js` — every backend module parses;
  every require on the boot path resolves.
- `tests/integrity/mergeResidue.unit.test.js` — the repo-wide version of the
  residue check.
