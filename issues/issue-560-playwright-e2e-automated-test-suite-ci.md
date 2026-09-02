---
title: '[FEAT]: Comprehensive Playwright Automated E2E Testing Suite for Complete Quiz & Flashcard Lifecycles'
labels: 'enhancement, backend, frontend, devops, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As new features and UI components are continuously contributed during open-source programs, regressions in critical user flows (user registration, taking a timed quiz, reviewing flashcards) can go unnoticed without end-to-end automated testing.

This feature introduces a **Comprehensive Playwright E2E Testing Suite for Core Platform Lifecycles in CI/CD**.

---

## Technical Scope & Architecture

### Test Automation Scope
1. **Authentication Flow Specs (`tests/e2e/auth.spec.js`)**:
   - User registration, form validation errors, JWT token receipt, and logout.
2. **Quiz Generation & Submission Specs (`tests/e2e/quiz-flow.spec.js`)**:
   - Generating a quiz for a subject, answering timed multiple-choice questions, navigating question palette, submitting quiz, and asserting score report visualization.
3. **Flashcard Review Lifecycle Specs (`tests/e2e/flashcards.spec.js`)**:
   - Creating a deck, flipping cards, grading difficulty (Again/Hard/Good/Easy), and verifying interval progression.
4. **CI Integration (`.github/workflows/e2e-tests.yml`)**:
   - Automated GitHub Actions workflow running Playwright tests against headless Chromium, Firefox, and WebKit on every pull request.
   - Artifact uploading of test traces and failure video recordings.

---

## Acceptance Criteria
- [ ] Playwright test suite covers Auth, Quiz runner, and Flashcard review lifecycles.
- [ ] Tests run successfully in GitHub Actions CI with reproducible results.
- [ ] Clear documentation in `docs/testing-guide.md` explaining how to run E2E tests locally.
