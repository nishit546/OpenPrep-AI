---
title: '[FEAT]: Smart AI Revision Reminder Push Notifications with Optimal Memory Retrieval Scheduling'
labels: 'enhancement, study-planner, backend, ai, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
According to Ebbinghaus's forgetting curve, reviewing a concept right before it fades from memory yields maximum neural retention. Sending generic notifications at arbitrary times is ineffective.

This feature implements **Smart AI Revision Reminder Push Notifications scheduled at each student's predicted memory decay inflection points**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Optimal Retrieval Dispatcher (`backend/services/smartNotificationService.js`)**:
   - Analyzes student flashcard SM-2 review history and quiz error logs.
   - Predicts the exact day and time a concept's retention probability falls below 75%.
   - Schedules a Web Push Notification using `web-push` containing a personalized question preview (e.g., "⚡ Quick 30s Check: Do you remember the formula for Carnot Engine Efficiency?").
2. **Notification Queue Worker**:
   - BullMQ / Redis job queue handling scheduled notification delivery with timezone offset calculation.
3. **REST Endpoints**:
   - `POST /api/notifications/subscribe` - Registers browser VAPID push subscription.
   - `PUT /api/notifications/preferences` - Configures quiet hours and reminder frequencies.

### Frontend Architecture
1. **Push Permission Prompt Banner (`frontend/src/components/notifications/PushSubscriptionBanner.jsx`)**:
   - Non-intrusive banner explaining the benefits of smart spaced repetition reminders with one-click enable.

---

## Acceptance Criteria
- [ ] Dispatches Web Push notifications based on student memory decay curves rather than fixed schedules.
- [ ] Respects user quiet hours (e.g., no notifications between 10:00 PM and 07:00 AM).
- [ ] Clicking the notification opens the exact question or flashcard for instant 30-second review.
