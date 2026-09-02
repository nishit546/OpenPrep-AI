---
title: '[TEST]: End-to-End Test Automation Suite with Playwright and GitHub Actions CI Matrix'
labels: 'enhancement, devops, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
Testing / DevOps / Continuous Integration

## Priority
P2 Medium

## Summary
Set up an automated End-to-End (E2E) testing framework using Playwright with cross-browser matrix coverage (Chromium, Firefox, WebKit) and GitHub Actions automated PR reporting.

## Problem Statement
Currently, regression testing is done manually across PRs, leading to unexpected frontend UI breakage, authentication token storage issues, and quiz submission bugs slipping into the main branch.

## Current Behavior
No automated browser E2E tests run on pull requests or release builds.

## Expected Behavior
Playwright runs a headless test suite against PR commits in GitHub Actions, automatically spinning up frontend/backend instances, testing critical student user journeys, and attaching failure screenshots/traces.

## User Story
As a core maintainer and contributor
I want reliable automated E2E tests on every pull request
So that regressions are detected before merging code into production

## Proposed Solution
1. Install and initialize `@playwright/test` in `frontend/` with configuration for Chromium, Firefox, and Mobile Safari.
2. Write E2E test specs: `auth.spec.js` (registration, login, logout), `quiz.spec.js` (generate, answer, submit, view score), `flashcard.spec.js` (SM-2 review flip).
3. Create `.github/workflows/e2e-tests.yml` to run Playwright in parallel on pull requests.

## Technical Scope

### Frontend Impact
Add `frontend/e2e/` test specifications and `playwright.config.js`.

### Backend Impact
Seed test user fixtures and mock API endpoints for reproducible testing.

### Database Impact
In-memory test database instance or seeded SQLite/PostgreSQL container.

### API Impact
GitHub Actions workflow triggers.

## Acceptance Criteria
- [ ] Playwright test suite executes and passes in <3 minutes on CI pipeline.
- [ ] Failed test runs automatically upload Playwright HTML report and video artifacts to GitHub Actions workflow summary.
- [ ] Includes tests for mobile smartphone viewport and desktop viewports.

## Testing Requirements

### Unit Tests
- [ ] Run `npx playwright test` locally with 100% pass rate.

### Manual Testing
- [ ] Trigger test failure intentionally and verify screenshot artifact generation in CI.

## Affected Areas
- [x] Frontend
- [x] DevOps
- [x] CI/CD

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium / Intermediate) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
