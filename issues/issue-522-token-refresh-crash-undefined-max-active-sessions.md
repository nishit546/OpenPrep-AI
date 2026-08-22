---
title: '[BUG]: Token Refresh Crashes — Undefined MAX_ACTIVE_SESSIONS Causes ReferenceError'
labels: 'ECSoC26, ECSoC26-L1, bug, backend, authentication, critical'
assignees: ''
---

## Issue Type
Bug / Runtime Crash

## Priority
P0 Critical

## Summary
The refresh token rotation logic in `authController.js` references an undefined variable `MAX_ACTIVE_SESSIONS`, causing a `ReferenceError` on every token refresh request. This breaks the entire authentication session lifecycle — users cannot maintain long-lived sessions and must re-login after every access token expiry (15 minutes).

## Problem Statement
In `backend/controllers/authController.js` lines 512–513, the refresh token pruning logic uses `MAX_ACTIVE_SESSIONS` to cap the number of concurrent sessions per user:

```javascript
if (user.refreshTokens.length > MAX_ACTIVE_SESSIONS) {
  user.refreshTokens = user.refreshTokens.slice(-MAX_ACTIVE_SESSIONS);
}
```

However, `MAX_ACTIVE_SESSIONS` is **never imported or defined** anywhere in the file. The variable only exists as a local constant in the test file `tests/controllers/authTokenPruning.unit.test.js` (line 3: `const MAX_ACTIVE_SESSIONS = 10`), which does not affect the runtime code.

When a user's access token expires (after 15 minutes) and the frontend calls the refresh endpoint, this code path is hit and throws:

```
ReferenceError: MAX_ACTIVE_SESSIONS is not defined
    at /backend/controllers/authController.js:512:45
```

The error is caught by the global error handler and returns a 500, effectively killing the user's session.

## Current Behavior
- User logs in successfully
- Access token expires after 15 minutes
- Frontend calls `POST /api/auth/refresh` with the refresh token
- Server throws `ReferenceError` at line 512
- User receives 500 error and must re-login

## Expected Behavior
- Refresh token endpoint rotates the token pair successfully
- Old refresh tokens beyond the active session limit are pruned
- User maintains seamless sessions without re-login

## Root Cause Analysis
The `MAX_ACTIVE_SESSIONS` constant was likely defined during initial development but was removed or never ported when the auth controller was refactored. The test file was written assuming the constant exists in the controller but tests a standalone function that re-declares it locally.

## User Story
As a logged-in user
I want my session to persist across access token expirations
So that I don't have to re-login every 15 minutes

## Proposed Solution
Add the constant definition near the top of `backend/controllers/authController.js` (after the imports, around line 14):

```javascript
const MAX_ACTIVE_SESSIONS = parseInt(process.env.MAX_ACTIVE_SESSIONS, 10) || 10;
```

This follows the project's pattern of using environment variables with sensible defaults (seen in `config/env.js`).

Alternatively, add `MAX_ACTIVE_SESSIONS` to `config/constants.js` and import it.

## Technical Scope

### Backend Impact
- **File:** `backend/controllers/authController.js`
  - **Line ~14:** Add `const MAX_ACTIVE_SESSIONS = ...` definition
  - **Lines 512–513:** Already reference the variable — will work once defined

### Frontend Impact
None — the bug is entirely server-side.

### Database Impact
None.

### API Impact
`POST /api/auth/refresh` stops returning 500 errors.

### Infrastructure Impact
None.

## Acceptance Criteria
- [ ] `MAX_ACTIVE_SESSIONS` is defined or imported in `authController.js`
- [ ] The constant defaults to `10` (or is configurable via env var)
- [ ] `POST /api/auth/refresh` with a valid refresh token returns 200 with new token pair
- [ ] When a user has > `MAX_ACTIVE_SESSIONS` refresh tokens, the oldest are pruned
- [ ] No `ReferenceError` appears in server logs during token refresh

## Edge Cases
- [ ] When `MAX_ACTIVE_SESSIONS` env var is set to 0 or negative, the default (10) is used
- [ ] When a user has exactly `MAX_ACTIVE_SESSIONS` tokens, no pruning occurs
- [ ] Concurrent refresh requests from the same user don't cause race conditions

## Security Considerations
The session limit is a security feature — it prevents token accumulation if a user logs in from many devices without ever logging out. Without this working, token arrays grow unbounded in the database.

## Accessibility Considerations
None.

## Performance Considerations
Pruning prevents unbounded growth of the `refreshTokens` JSONB array in the `Users` table, which improves query performance for token lookups.

## Testing Requirements

### Unit Tests
- [ ] The existing test in `tests/controllers/authTokenPruning.unit.test.js` should be updated to test the actual controller function rather than a standalone re-implementation
- [ ] Add test: refresh succeeds when token count is below limit
- [ ] Add test: oldest tokens are pruned when count exceeds limit

### Integration Tests
- [ ] Full flow: login → receive tokens → wait/expire access token → refresh → receive new tokens
- [ ] Full flow: login from 11 devices → verify oldest session is invalidated

### Manual Testing
- [ ] Login via the frontend, wait 15 minutes, verify the app auto-refreshes without requiring re-login

## Affected Areas
- [x] Backend
- [x] Authentication

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] `MAX_ACTIVE_SESSIONS` defined with sensible default
- [ ] Token refresh works without ReferenceError
- [ ] Session pruning works correctly
- [ ] Existing tests pass
- [ ] Documentation updated
- [ ] Ready for production
