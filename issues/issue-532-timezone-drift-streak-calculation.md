---
title: '[BUG]: Timezone Offset Drift in Daily Study Streak Reset & Daylight Saving Transitions'
labels: 'bug, backend, medium-priority, good first issue, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Issue Type
Bug Fix / Date & Time Logic / Streak Gamification

## Priority
P2 Medium

## Summary
Fix an issue where students in non-UTC timezones (e.g., IST UTC+5:30, PST UTC-8) lose active study streaks unexpectedly when completing tasks between 12:00 AM and their local timezone offset.

## Problem Statement
Study streak calculations use server UTC midnight (`new Date().toISOString().split("T")[0]`) instead of evaluating the student’s configured local timezone or request header timezone offset, causing streaks to reset prematurely.

## Current Behavior
A user completing a goal at 1:00 AM local time is registered under the previous UTC day, breaking their consecutive day streak count.

## Expected Behavior
Daily activity timestamps are normalized against the user’s declared IANA timezone (e.g. `Asia/Kolkata`, `America/New_York`) using `date-fns-tz` or `luxon`, preserving accurate continuous streak counts.

## User Story
As an international student
I want my daily study streak to accurately reflect my local midnight transition
So that my hard-earned study streaks are never lost due to UTC server offset differences

## Proposed Solution
1. Add `timezone` field (defaulting to `Asia/Kolkata` or detected client timezone) to `User` profile model.
2. Refactor `backend/src/utils/streakCalculator.js` to compute calendar day differences using `date-fns-tz` with timezone awareness.
3. Pass client `Intl.DateTimeFormat().resolvedOptions().timeZone` during onboarding and update streak logic.

## Technical Scope

### Frontend Impact
Detect and transmit user timezone header in API requests via Axios interceptor.

### Backend Impact
Refactor streak verification logic in `backend/src/controllers/progressController.js` and `streakCalculator.js`.

### Database Impact
Add `timezone` column to `users` table.

### API Impact
PUT `/api/user/preferences/timezone`.

## Acceptance Criteria
- [ ] Completing a task across any global timezone between 12:01 AM and 11:59 PM local time correctly marks the streak for that local calendar day.
- [ ] Daylight Saving Time (DST) forward/backward clock adjustments do not break consecutive streak calculations.
- [ ] Unit tests cover edge cases for UTC+14 (Kiribati) and UTC-12 (Baker Island).

## Testing Requirements

### Unit Tests
- [ ] Jest test suite testing 15 distinct global timezone offsets and edge-of-midnight timestamps.

### Manual Testing
- [ ] Manually change system clock timezone and verify streak retention on dashboard.

## Affected Areas
- [x] Backend
- [x] Database

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
