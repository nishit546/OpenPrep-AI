---
title: '[FEAT]: Automated Sentry Error Tracking & Frontend Breadcrumb Telemetry Integration'
labels: 'enhancement, devops, frontend, backend, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
In production, unexpected client-side JavaScript crashes and unhandled backend API rejections can disrupt student exam sessions without maintainers being alerted.

This feature integrates **Sentry Error Tracking and Performance Monitoring** across both the React frontend and Express backend.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Sentry React SDK Integration (`frontend/src/utils/sentry.js`)**:
   - Initializes `@sentry/react` with configurable sample rate, environment tagging, and release versioning.
   - Captures user navigation breadcrumbs and console error logs.
2. **React Error Boundary Component (`frontend/src/components/common/SentryErrorBoundary.jsx`)**:
   - Graceful fallback UI when a component throws an error, featuring an "Oops! Something went wrong" modal with a "Reload Page" button and an optional user feedback crash dialog.

### Backend Architecture
1. **Express Sentry Middleware (`backend/utils/sentry.js`)**:
   - Configures `@sentry/node` and `@sentry/profiling-node`.
   - Request handler middleware capturing incoming route context, omitting sensitive headers (Authorization tokens, passwords, cookies).
   - Global error handler middleware dispatching unhandled 500 exceptions directly to Sentry.

---

## Acceptance Criteria
- [ ] Unhandled exceptions in React components and Express routes are reported to Sentry with complete stack traces.
- [ ] Sensitive user data (passwords, JWTs) is automatically sanitized and excluded from error payloads.
- [ ] Error boundary gracefully renders a recovery UI without crashing the entire single-page application.
- [ ] Environment variables `VITE_SENTRY_DSN` and `SENTRY_DSN` configure logging cleanly.
