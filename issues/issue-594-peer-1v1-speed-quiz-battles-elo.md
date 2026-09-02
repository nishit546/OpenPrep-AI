---
title: '[FEAT]: Peer-to-Peer 1v1 Live Speed Quiz Battles with Elo Rating & Matchmaking Queue'
labels: 'enhancement, quiz-system, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Solo exam revision can quickly become monotonous. Adding a synchronous competitive dynamic boosts motivation, improves speed under time pressure, and drives community engagement through gamified peer challenges.

This feature introduces **1v1 Live Speed Quiz Battles** with real-time WebSocket round synchronization, live health bars, and an Elo/Glicko-2 rating matchmaking queue.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Matchmaking Queue Engine (`backend/services/battleMatchmakerService.js`)**:
   - In-memory / Redis matchmaking queue pairing students by selected Subject, Exam Tier, and Elo rating difference ($\Delta \text{Elo} \le 150$, expanding over time).
2. **WebSocket Battle Room Handler (`backend/services/quizBattleSocketService.js`)**:
   - Synchronizes 5-round question cycles with strict 15-second per-question countdown clocks.
   - Calculates speed-weighted scoring: faster correct answers yield higher points ($1000 - \text{ms elapsed} \times 0.05$).
   - Calculates post-match Elo adjustments for Winner and Loser using standard Elo formula ($K=32$).
3. **REST Endpoints (`backend/controllers/battleController.js`)**:
   - `GET /api/battles/leaderboard` - Fetches global and squad Elo rankings.
   - `GET /api/battles/history` - Retrieves user's head-to-head match history and win rate.

### Frontend Architecture
1. **Matchmaking Lobby (`frontend/src/components/battle/BattleLobby.jsx`)**:
   - "Find Match" animated radar spinner with estimated queue wait time and Subject selector.
   - "Challenge a Friend" room code generator with direct invite URL copying.
2. **1v1 Battle Arena Screen (`frontend/src/components/battle/BattleArena.jsx`)**:
   - Split duel view: Student vs. Opponent with live avatars, reactive combo streak animations, and real-time HP/score gauges.
   - Instant visual feedback on opponent answer submission without revealing choice until round concludes.
   - Post-match victory/defeat screen showing Elo change (e.g., $+24\text{ Elo}$) and detailed question review.

---

## Acceptance Criteria
- [ ] Matchmaking pairs available players within $\pm 200$ Elo points within 10 seconds.
- [ ] WebSocket syncs question start, ticking timer, and score changes with zero drift.
- [ ] Elo ratings calculate deterministically and update immediately in the database upon battle conclusion.
- [ ] Jest tests verify matchmaker timeout expansions and Elo rating calculation math.
