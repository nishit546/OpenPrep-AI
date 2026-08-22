---
title: '[BUG]: Study Reminder Cron Does Nothing — References Non-Existent plan.plan Field'
labels: 'ECSoC26, ECSoC26-L1, bug, backend'
assignees: ''
---

## Issue Type
Bug / Dead Code / Cron Failure

## Priority
P1 High

## Summary
The study reminder cron job (`studyReminderCron.js`) iterates over `plan.plan` to find tasks due within the next hour, but the `StudyPlan` model has no `plan` field — the correct field is `dailyGoals`. As a result, the cron job silently skips every study plan and never sends any task-due notifications.

## Problem Statement
In `backend/jobs/studyReminderCron.js` line 25:

```javascript
for (const plan of activePlans) {
  if (!plan.plan || !Array.isArray(plan.plan)) continue;  // <-- plan.plan is undefined
```

The `StudyPlan` model (`backend/models/StudyPlan.js`) defines these JSONB fields:
- `dailyGoals` (line 28) — array of daily study tasks
- `milestones` (line 32) — array of milestones

There is **no `plan` field** on the model. The cron job checks `plan.plan`, gets `undefined`, hits the `continue` statement, and moves to the next plan. Every plan is skipped. No notifications are ever sent.

## Current Behavior
- Cron runs every 15 minutes
- Fetches all active study plans from the database
- For each plan, checks `plan.plan` → `undefined` → `continue`
- No task-due notifications are ever created
- Users never receive "Task Due Soon" reminders

## Expected Behavior
- Cron iterates over `plan.dailyGoals` (the correct field)
- Finds tasks scheduled within the next hour
- Sends "Task Due Soon" notifications to users
- Users receive timely reminders before their study sessions

## Root Cause Analysis
The cron job was written assuming a `plan` field that either:
1. Was renamed to `dailyGoals` during development
2. Was a different data structure that was refactored
3. Was never correctly aligned with the model schema

## User Story
As a student with an active study plan
I want to receive reminders when my scheduled tasks are due soon
So that I stay on track with my study schedule

## Proposed Solution
Replace `plan.plan` with `plan.dailyGoals` and adjust the task structure to match the actual `dailyGoals` schema:

```javascript
// BEFORE (line 25-27)
if (!plan.plan || !Array.isArray(plan.plan)) continue;
for (const item of plan.plan) {
  if (!item.tasks || !Array.isArray(item.tasks)) continue;

// AFTER
if (!plan.dailyGoals || !Array.isArray(plan.dailyGoals)) continue;
for (const item of plan.dailyGoals) {
  if (!item.tasks || !Array.isArray(item.tasks)) continue;
```

Also verify the `dailyGoals` item structure to ensure `item.tasks`, `task.scheduledTime`, and `task.completed` fields exist. If the structure is different, adapt accordingly.

## Technical Scope

### Backend Impact
- **File:** `backend/jobs/studyReminderCron.js`
  - **Line 25:** Change `plan.plan` to `plan.dailyGoals`
  - **Lines 27–28:** Verify task structure matches `dailyGoals` schema

### Frontend Impact
None.

### Database Impact
None — the data is already stored in `dailyGoals`.

### API Impact
Notifications will start being sent (previously silent).

## Acceptance Criteria
- [ ] `plan.plan` is replaced with `plan.dailyGoals` in the cron job
- [ ] The cron job correctly iterates over the `dailyGoals` array
- [ ] Tasks with `scheduledTime` within the next hour trigger notifications
- [ ] Users receive "Task Due Soon" push/in-app notifications
- [ ] The cron job handles empty `dailyGoals` arrays gracefully

## Edge Cases
- [ ] `dailyGoals` is an empty array → no notifications (correct)
- [ ] A task has no `scheduledTime` → skip it (correct)
- [ ] A task is already `completed: true` → skip it (correct)
- [ ] Multiple tasks due in the same window → each generates a notification

## Security Considerations
None.

## Accessibility Considerations
Notifications should include clear, readable text.

## Performance Considerations
The cron runs every 15 minutes and queries all active plans. For large user bases, consider adding an index on `startDate`/`endDate` or batching the query.

## Testing Requirements

### Unit Tests
- [ ] Create a `StudyPlan` with `dailyGoals` containing a task due in 30 minutes → verify notification is created
- [ ] Create a `StudyPlan` with `dailyGoals` containing a completed task → verify no notification
- [ ] Create a `StudyPlan` with empty `dailyGoals` → verify no error

### Integration Tests
- [ ] Full flow: active plan with due task → cron runs → notification appears in user's notification list

### Manual Testing
- [ ] Create a study plan with a task due in 15 minutes → wait for cron cycle → verify notification received

## Affected Areas
- [x] Backend
- [x] Notifications

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] `plan.plan` replaced with `plan.dailyGoals`
- [ ] Notifications are sent for due tasks
- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Ready for production
