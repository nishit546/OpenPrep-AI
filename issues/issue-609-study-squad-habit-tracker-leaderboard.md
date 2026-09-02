---
title: '[FEAT]: Real-Time Study Squad Habit Tracker & Shared Accountability Leaderboards'
labels: 'enhancement, dashboard, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Peer accountability dramatically improves study discipline. When students see their squad teammates completing daily goals, maintaining streaks, and solving PYQs, motivation multiplies.

This feature creates a **Real-Time Study Squad Habit Tracker & Shared Accountability Dashboard** with weekly leaderboards, habit checklists, and celebration notifications.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Squad Habit Grid (`frontend/src/components/squads/SquadHabitGrid.jsx`)**:
   - Visual 7-day habit matrix showing live completion checkmarks for all squad members across shared goals (e.g., "50 Flashcards", "1 Mock Quiz", "2 Hours Deep Work").
   - Live presence indicator ("Studying Now" green pulse badge).
2. **Squad Weekly Leaderboard (`frontend/src/components/squads/SquadLeaderboard.jsx`)**:
   - Ranked list showing Squad XP, weekly consistency percentage, and streak flame badges.
   - "Nudge Teammate" friendly push notification action when a teammate hasn't checked in by evening.
3. **Celebration Confetti & Squad Level Progress Bar**:
   - Collaborative XP bar that unlocks squad badges when collective study milestones are reached.

### Backend Architecture
1. **Squad Aggregation & Nudge Service (`backend/services/squadHabitService.js`)**:
   - Aggregates daily check-ins and calculates collective squad level progress.
   - Rate-limited peer nudge notification dispatcher.
2. **REST Endpoints (`backend/controllers/squadHabitController.js`)**:
   - `GET /api/squads/:squadId/habits` - Retrieves current week habit matrix for all squad members.
   - `POST /api/squads/:squadId/nudge` - Sends a friendly reminder notification to an inactive teammate.

---

## Acceptance Criteria
- [ ] Squad habit matrix updates in real time when members complete daily tasks.
- [ ] Weekly leaderboard accurately computes XP and consistency rankings.
- [ ] Peer nudge system enforces a 1-nudge-per-teammate-per-day rate limit.
- [ ] Unit tests verify squad score aggregation and permission validation.
