---
title: '[DOCS]: Interactive OpenAPI 3.1 Scalar API Reference with Try-It-Out Live Playground'
labels: 'documentation, backend, good first issue, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Issue Type
Documentation / Developer Experience / API Spec

## Priority
P3 Low

## Summary
Build a modern, developer-friendly OpenAPI 3.1 specification interactive API reference using Scalar / Swagger UI hosted directly on `/api/docs`.

## Problem Statement
Open source contributors struggle to understand backend API endpoints, payload schemas, and authentication headers due to fragmented markdown documentation and lack of an interactive API test bench.

## Current Behavior
API routes are partially documented across scattered README files without standardized JSON schemas or interactive testing tools.

## Expected Behavior
Developers can visit `/api/docs` in their browser to view a sleek, dark-themed Scalar documentation portal with code snippets in cURL, JavaScript, Python, and a built-in interactive JWT test console.

## User Story
As an open-source contributor
I want an interactive API playground with clear request/response models
So that I can quickly understand and integrate backend endpoints into the frontend

## Proposed Solution
1. Create `backend/src/docs/openapi.json` containing standardized OpenAPI 3.1.0 specifications for all Auth, Quiz, Flashcard, and PYQ routes.
2. Integrate `@scalar/express-api-reference` into `backend/src/server.js` at endpoint `/api/docs`.
3. Provide schema models with example request bodies, expected status codes, and JWT Bearer auth security schemes.

## Technical Scope

### Frontend Impact
Link to API docs in footer and contributor guide.

### Backend Impact
Add `@scalar/express-api-reference` route handler and `openapi.json` schema.

### Database Impact
None.

### API Impact
GET `/api/docs` and GET `/api/openapi.json`.

## Acceptance Criteria
- [ ] Visiting `/api/docs` renders complete Scalar interactive API documentation.
- [ ] Includes accurate schemas for all existing REST routes with Bearer Token auth authorization support.
- [ ] All endpoints can be tested live directly from the Scalar browser console.

## Testing Requirements

### Unit Tests
- [ ] Validate `openapi.json` with an OpenAPI 3.1 JSON schema linter (`spectral`).

### Manual Testing
- [ ] Authenticate with test token and execute `/api/subjects` request from Scalar console.

## Affected Areas
- [x] Backend
- [x] Documentation

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
