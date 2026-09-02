---
title: '[FEAT]: Two-Way Calendar Sync with Google Calendar API and Notion Study Export'
labels: 'enhancement, backend, study-planner, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
New Feature / Integrations / Third-Party APIs

## Priority
P2 Medium

## Summary
Build a two-way synchronization bridge between OpenPrep study plans, Google Calendar (OAuth2 + Calendar API), and Notion Databases for seamless study schedule integration.

## Problem Statement
Students manage their daily schedules in personal productivity tools (Google Calendar, Notion) and find it tedious to manually copy revision dates and study plan tasks from OpenPrep.

## Current Behavior
Study plans and daily goals remain locked inside the OpenPrep AI web application without external export or calendar synchronization.

## Expected Behavior
Students can click "Sync to Google Calendar" or "Export to Notion", automatically generating recurring study timeblocks, exam milestone alerts, and synchronized task checklists in their personal calendars.

## User Story
As a busy student
I want my AI study plan to automatically sync to my Google Calendar and Notion
So that my daily study tasks appear alongside my lectures and personal calendar reminders

## Proposed Solution
1. Implement Google Calendar API integration using `googleapis` with OAuth2 token storage in user credentials.
2. Build Notion Integration using `@notionhq/client` to create structured study plan databases with properties (Subject, Status, Due Date).
3. Create `frontend/src/components/study/CalendarSyncModal.jsx` with sync toggles and one-click export actions.

## Technical Scope

### Frontend Impact
Calendar sync settings UI modal, OAuth connection status badges.

### Backend Impact
Google OAuth callback handler, Notion integration service, background sync cron worker.

### Database Impact
Store encrypted OAuth refresh tokens in `UserIntegration` table.

### API Impact
POST `/api/integrations/gcal/sync`, POST `/api/integrations/notion/export`.

## Acceptance Criteria
- [ ] Successfully creates study blocks in user Google Calendar with accurate start/end timestamps and revision subject titles.
- [ ] Notion export generates a clean database view with subject tags and due dates.
- [ ] Revoking access cleanly clears stored tokens and disables sync flags.

## Testing Requirements

### Unit Tests
- [ ] Mock OAuth token exchange and payload serialization unit tests.

### Manual Testing
- [ ] Connect real test Google account and verify event block creation in Google Calendar UI.

## Affected Areas
- [x] Backend
- [x] Study-Planner
- [x] Frontend

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
