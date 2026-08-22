---
title: '[BUG]: Server Crash — Missing Route Imports for pdfAnnotationRoutes and folderRoutes'
labels: 'ECSoC26, ECSoC26-L1, bug, backend, critical'
assignees: ''
---

## Issue Type
Bug / Server Crash

## Priority
P0 Critical

## Summary
The backend server crashes at startup with `ReferenceError: pdfAnnotationRoutes is not defined` because two route modules are mounted in `server.js` but never imported. This makes two entire API subsystems (PDF annotations and folders) completely inaccessible and causes a fatal startup error.

## Problem Statement
In `backend/server.js`, the route mounting section (lines 245 and 268) references `pdfAnnotationRoutes` and `folderRoutes`, but the import section (lines 46–74) never requires either module. When Node.js reaches these lines during startup, it throws a `ReferenceError` and the server process terminates.

## Current Behavior
The server crashes immediately on startup with:
```
ReferenceError: pdfAnnotationRoutes is not defined
    at Object.<anonymous> (server.js:245:34)
```
The `/api/documents` and `/api/folders` endpoints are completely unreachable.

## Expected Behavior
The server boots successfully with all 25+ route groups mounted and functional, including PDF annotation and folder management endpoints.

## Root Cause Analysis
The route files `backend/routes/pdfAnnotationRoutes.js` and `backend/routes/folderRoutes.js` exist on disk but were likely removed from the import section during a merge conflict or refactoring pass, while their `app.use()` mount calls were left behind.

## User Story
As a developer running the backend
I want the server to start without crashing
So that all API features including PDF annotations and folder management are available

## Proposed Solution
Add the missing `require()` statements at the top of `backend/server.js`, in the import routes section (after line 70):

```javascript
const pdfAnnotationRoutes = require('./routes/pdfAnnotationRoutes');
const folderRoutes = require('./routes/folderRoutes');
```

Alternatively, if these features are not yet ready for production, remove the broken `app.use()` mount lines at 245 and 268.

## Technical Scope

### Backend Impact
- **File:** `backend/server.js`
  - **Line 46–74:** Add 2 missing `require` statements
  - **Line 245:** `app.use('/api/documents', pdfAnnotationRoutes)` — currently broken
  - **Line 268:** `app.use('/api/folders', folderRoutes)` — currently broken

### Frontend Impact
None — frontend may already call these endpoints and receive 500 errors.

### Database Impact
None.

### API Impact
Two route groups (`/api/documents`, `/api/folders`) become functional.

### Infrastructure Impact
None.

## Acceptance Criteria
- [ ] `pdfAnnotationRoutes` is imported via `require('./routes/pdfAnnotationRoutes')` in `server.js`
- [ ] `folderRoutes` is imported via `require('./routes/folderRoutes')` in `server.js`
- [ ] Server starts without `ReferenceError` on any route variable
- [ ] `GET /api/documents/*` endpoints respond (not 500 or crash)
- [ ] `GET /api/folders/*` endpoints respond (not 500 or crash)

## Edge Cases
- [ ] Verify that both route files export a valid Express Router (no circular dependency issues)
- [ ] Ensure `pdfAnnotationController` and `folderController` are properly defined and importable

## Security Considerations
Ensure both route groups have proper `protect` middleware applied (authentication required).

## Accessibility Considerations
None.

## Performance Considerations
None — these are standard route registrations.

## Testing Requirements

### Unit Tests
- [ ] Add a test that imports `server.js` and verifies no `ReferenceError` is thrown
- [ ] Add smoke tests for `GET /api/documents/*` and `GET /api/folders/*` returning valid responses

### Manual Testing
- [ ] Run `node backend/server.js` and confirm no crash on startup
- [ ] Send `GET /api/folders` with a valid auth token and verify a response

## Affected Areas
- [x] Backend
- [x] API

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] Server starts without crash
- [ ] Both endpoint groups respond correctly
- [ ] Acceptance criteria met
- [ ] Documentation updated
- [ ] Ready for production
