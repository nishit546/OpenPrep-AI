---
title: '[FEAT]: AI-Powered Personalized Spaced Repetition Revision Calendar with Burnout Prevention & Buffer Days'
labels: 'enhancement, study-planner, ai, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Traditional study planners construct rigid daily timetables that fail when an emergency occurs. If a student misses one day, the accumulated backlog causes anxiety, cognitive overload, and eventual study plan abandonment.

This feature creates an **AI-Powered Adaptive Revision Calendar with Dynamic Workload Smoothing, Burnout Prevention, and Automated Buffer Days**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Adaptive Study Schedule Engine (`backend/services/adaptiveScheduleService.js`)**:
   - Calculates cognitive load score per day based on topic difficulty weights, due flashcards, and available user study hours.
   - Workload Smoothing Algorithm: automatically shifts non-urgent review queues forward or backward to prevent daily study spikes exceeding user capacity.
   - Inserts automatic "Catch-Up & Rest Buffer Days" every 5-7 days for consolidation and mental recovery.
2. **REST Endpoints (`backend/controllers/adaptiveScheduleController.js`)**:
   - `POST /api/study-schedule/generate` - Creates initial optimized schedule based on target exam date and daily hours.
   - `POST /api/study-schedule/rebalance` - Dynamically recalculates schedule when user logs missed days or falls behind.

### Frontend Architecture
1. **Interactive Revision Calendar (`frontend/src/components/planner/AdaptiveCalendarView.jsx`)**:
   - Month/Week/Day views with color-coded cognitive load heatmap bars (Light: Green, Balanced: Blue, Heavy: Amber, Overload: Red).
   - "Rebalance My Schedule" one-click action button with preview diff modal showing rescheduled topics.
   - Drag-and-drop topic rescheduling with instant daily hour recalculation.

---

## Acceptance Criteria
- [ ] Algorithm automatically redistributes overdue tasks across future buffer days without exceeding daily capacity.
- [ ] Visual cognitive load heatmap clearly indicates daily study intensity.
- [ ] "Rebalance Schedule" adjusts tasks intelligently within 2 seconds.
- [ ] Unit tests cover various exam timeline lengths and capacity constraint edge cases.
