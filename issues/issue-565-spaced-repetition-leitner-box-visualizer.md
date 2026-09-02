---
title: '[FEAT]: Spaced-Repetition Leitner Box Visualizer with Interactive Card Drift & Review Forecast'
labels: 'enhancement, flashcards, frontend, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
While OpenPrep AI uses the SuperMemo SM-2 algorithm to schedule flashcard reviews, students often lack visual intuition on their memory retention status. A visual Leitner Box representation gives learners immediate clarity on how many cards are in learning, reviewing, or mastered states.

This feature implements an **Interactive Leitner Box Visualizer & 30-Day Retention Forecast Chart**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **3D/2D Leitner Box Interactive Deck Stage (`frontend/src/components/flashcards/LeitnerBoxVisualizer.jsx`)**:
   - 5 distinct visual boxes representing proficiency levels (Box 1: Daily -> Box 5: Monthly).
   - Animated cards transitioning between boxes upon completion of review sessions (moving forward on success, returning to Box 1 on forgotten).
   - Clickable box trays that allow filtering and reviewing cards belonging to a specific mastery tier.
2. **30-Day Review Load Forecasting Graph (`frontend/src/components/flashcards/ReviewLoadForecast.jsx`)**:
   - Bar chart showing predicted daily card review volume over the upcoming 30 days based on SM-2 intervals.
   - Visual warnings for upcoming "heavy workload" days to help students balance study schedules.

### Backend Architecture
1. **Leitner & Forecast Calculation Service (`backend/services/spacedRepetitionAnalytics.js`)**:
   - Aggregates user's flashcard deck database into Leitner box buckets based on repetition counts and easiness factors ($EF$).
   - Computes daily due date histogram projection for the next 30 calendar days.
2. **REST Endpoints (`backend/controllers/flashcardAnalyticsController.js`)**:
   - `GET /api/flashcards/analytics/leitner-distribution` - Returns count and percentage of cards per Leitner stage.
   - `GET /api/flashcards/analytics/due-forecast` - Returns daily projected review loads.

---

## Acceptance Criteria
- [ ] Visual Leitner boxes display accurate real-time card counts for all user decks.
- [ ] Interactive animations show card promotion/demotion between boxes after review sessions.
- [ ] 30-day forecast chart correctly reflects scheduled SM-2 due dates.
- [ ] Responsive layout with smooth touch drag-and-drop interactions on mobile.
