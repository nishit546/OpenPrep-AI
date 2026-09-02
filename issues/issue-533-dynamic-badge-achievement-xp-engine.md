---
title: '[FEAT]: Dynamic Badge Achievement Engine with Tiered XP Rewards & Streak Freezes'
labels: 'enhancement, gamification, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
New Feature / Gamification / Student Engagement

## Priority
P2 Medium

## Summary
Implement a comprehensive Gamification Engine featuring unlockable achievement badges (Bronze, Silver, Gold, Diamond), XP levels with progress tiers, and purchasable Streak Freeze power-ups.

## Problem Statement
Student retention drops during mid-semester prep; the current platform lacks rewards, milestones, and gamified incentives to keep students engaged consistently.

## Current Behavior
Basic streak number display with no badge unlocks, XP progression, or reward redemption.

## Expected Behavior
Students earn XP for completing quizzes, reviewing flashcards, and maintaining study streaks. Milestone badges pop up with confetti animations, and students can spend XP points to equip Streak Freezes to protect their streaks.

## User Story
As a competitive student
I want to earn XP, unlock achievements, and level up my learner profile
So that I stay motivated and rewarded throughout my exam preparation journey

## Proposed Solution
1. Design `Badge` and `UserBadge` schema models with unlock conditions (e.g., "Night Owl: Study after 11 PM", "Grandmaster: 100 Flashcards in one day").
2. Create `backend/src/services/gamificationService.js` to evaluate trigger events asynchronously upon quiz/flashcard submissions.
3. Build `frontend/src/components/gamification/BadgeShowcase.jsx` and `ConfettiModal.jsx` using `canvas-confetti`.

## Technical Scope

### Frontend Impact
Confetti animations, badge unlock popup modals, XP level progression bar on Navbar.

### Backend Impact
Event-driven gamification hooks listening to study actions and awarding XP/badges.

### Database Impact
Tables: `badges`, `user_badges`, `user_xp_transactions`, `streak_freezes`.

### API Impact
GET `/api/gamification/profile`, POST `/api/gamification/redeem-streak-freeze`.

## Acceptance Criteria
- [ ] Earning a badge displays a celebratory confetti popup modal with sound effect.
- [ ] XP bar dynamically calculates level based on formula: $Level = lfloorsqrt{XP / 100}floor + 1$.
- [ ] Streak freeze successfully prevents streak reset if a student misses exactly 1 day.

## Testing Requirements

### Unit Tests
- [ ] Unit tests for XP calculation algorithm and badge trigger rules.

### Manual Testing
- [ ] Trigger badge unlock condition in development and verify UI animation trigger.

## Affected Areas
- [x] Frontend
- [x] Backend
- [x] Database

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
