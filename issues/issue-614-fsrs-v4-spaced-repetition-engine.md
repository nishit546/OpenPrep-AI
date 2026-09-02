---
title: '[FEAT]: Next-Gen FSRS-4 Spaced Repetition Scheduling Algorithm Engine for Flashcard Decks'
labels: 'enhancement, algorithm, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Traditional SuperMemo (SM-2) algorithms rely on simplistic ease-factor multipliers that frequently over-schedule easy cards or under-schedule difficult concepts, leading to revision fatigue. Modern cognitive science research demonstrates that the **FSRS-4 (Free Spaced Repetition Scheduler)** algorithm models memory stability and difficulty with significantly higher predictive accuracy (retrievability $R = (1 + \text{factor} \cdot t / S)^{-w}$).

This feature integrates the FSRS-4 algorithm engine into OpenPrep AI to optimize flashcard review intervals and maximize retention with minimal daily review load.

---

## Technical Scope & Architecture

### Algorithmic Engine & Mathematical Formulation
1. **FSRS Scheduling Core (`backend/services/fsrsScheduler.js`)**:
   - Implements the 17-parameter FSRS-4 model:
     - Memory Stability ($S$): Time in days for retrievability to drop from 100% to target retention (default $R_{\text{target}} = 0.90$).
     - Difficulty ($D$): Intrinsic difficulty of the item ($1 \le D \le 10$).
     - Retrievability ($R$): Probability of recalling the card at current time delta $t$.
   - Rating responses: `Again (1)`, `Hard (2)`, `Good (3)`, `Easy (4)`.
   - Stability updates upon successful recall ($R \ge R_{\text{target}}$) and lapses ($R < R_{\text{target}}$).
2. **User Retention Preference Calibration (`backend/controllers/fsrsController.js`)**:
   - `PUT /api/flashcards/settings/fsrs` - Allows users to tune desired retention rates ($80\% - 97\%$) and view predicted daily review load curves.
   - `GET /api/flashcards/analytics/retention-curve` - Generates the empirical forgetting curve based on user review logs.

### Database Schema Updates
1. **Flashcard Review State (`backend/models/Flashcard.js`)**:
   - Store `stability` (FLOAT), `difficulty` (FLOAT), `elapsed_days` (INT), `scheduled_days` (INT), `reps` (INT), `lapses` (INT), `state` (New / Learning / Review / Relearning).

---

## Acceptance Criteria
- [ ] Mathematical implementation of FSRS-4 passes comprehensive unit test vectors against official reference benchmarks.
- [ ] User can customize desired retention rate ($80\%–95\%$), dynamically recalculating next review dates.
- [ ] Smooth database migration for existing SM-2 flashcard review records into FSRS-4 initial parameters.
- [ ] Analytics endpoint renders personalized memory stability curves and daily workload projections.
