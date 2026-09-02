---
title: '[FEAT]: Two-Way Calendar Synchronization with Google Calendar, Outlook, and Apple iCal (.ics)'
labels: 'enhancement, study-planner, backend, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students create detailed AI study plans on OpenPrep AI but often miss scheduled milestones because their daily schedules live inside Google Calendar, Microsoft Outlook, or Apple Calendar on their mobile phones.

This feature implements **Two-Way Study Plan Calendar Synchronization and Live iCal (.ics) Webcal Feeds**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **iCalendar (.ics) Feed Generator (`backend/services/icalService.js`)**:
   - Generates standardized RFC 5545 `.ics` calendar feeds for a student's active study milestones and exam deadlines.
   - Secure unique subscription URL with token authentication allowing one-click subscription in Apple Calendar, Outlook, and Google Calendar.
2. **Google Calendar API Integration (`backend/services/googleCalendarService.js`)**:
   - OAuth2 flow for Google Calendar integration.
   - Creates a dedicated "OpenPrep AI Study Plan" sub-calendar and syncs daily study tasks with reminders.
3. **REST Endpoints (`backend/controllers/calendarSyncController.js`)**:
   - `GET /api/calendar/feed/:syncToken/study-plan.ics` - Public authenticated iCal stream endpoint.
   - `POST /api/calendar/google/sync` - Triggers two-way push to connected Google account.

### Frontend Architecture
1. **Calendar Sync Hub (`frontend/src/components/study-plan/CalendarSyncModal.jsx`)**:
   - One-click "Add to Google Calendar", "Add to Outlook", and "Copy iCal Feed URL" buttons with step-by-step setup guides.

---

## Acceptance Criteria
- [ ] Study plan goals and exam countdown dates export accurately to `.ics` calendar feeds.
- [ ] Google Calendar integration pushes study events with proper start times, titles, and descriptions.
- [ ] Modifying a study plan task updates the synced calendar feed automatically.
- [ ] Unit tests for iCal formatting and timezone offset handling.
