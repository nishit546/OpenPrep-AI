---
title: '[FEAT]: Smart Mock Exam Integrity Monitor with Tab Switch Detection & Focus Loss Telemetry'
labels: 'enhancement, frontend, security, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When preparing for high-stakes competitive examinations, simulating authentic exam hall discipline is critical. Students frequently succumb to the habit of switching browser tabs to search for answers during mock tests, giving themselves a false sense of preparedness.

This feature introduces a **Client-Side Mock Exam Integrity & Focus Monitor** that tracks tab switches, fullscreen departures, clipboard paste actions, and devtool inspection events to compute an authentic "Exam Discipline Score".

---

## Technical Scope & Architecture

### Frontend Telemetry & Event Hooks
1. **Exam Integrity Listener Hook (`frontend/src/hooks/useExamIntegrity.js`)**:
   - Monitors `document.visibilitychange`, `window.onblur`, and `window.onfocus` events.
   - Enforces Fullscreen API (`document.documentElement.requestFullscreen()`); detects fullscreen exit.
   - Intercepts copy/paste clipboard events and right-click context menus during active test sessions.
   - Debounces rapid blur/focus anomalies to eliminate false positives from OS notifications.
2. **Discipline Telemetry Modal (`frontend/src/components/exam/IntegrityWarningModal.jsx`)**:
   - Displays gentle warning toast on first switch; shows timed lockout countdown if violations exceed threshold (configurable, e.g. 3 tab switches).
   - In-test persistent badge displaying focus status and warning count.
3. **Post-Exam Integrity Breakdown (`frontend/src/components/exam/IntegritySummaryCard.jsx`)**:
   - Visual timeline plotting exact timestamps when focus was lost alongside question numbers.
   - Calculates overall Focus Index ($0–100\%$).

---

## Acceptance Criteria
- [ ] Accurately logs tab switches, window minimize events, and fullscreen exits with microsecond timestamps.
- [ ] Displays polite customizable warnings before penalizing or locking out the student.
- [ ] Produces a post-exam timeline diagram showing focus loss events mapped to specific question intervals.
- [ ] Does not disrupt test submissions or lose ongoing question responses if connection fluctuates.
