---
title: '[FEAT]: Ebbinghaus Retention Curve & Student Memory Decay Heatmap Visualization'
labels: 'enhancement, analytics, dashboard, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
New Feature / Analytics / Data Visualization

## Priority
P2 Medium

## Summary
Build an interactive memory retention curve chart and calendar activity heatmap displaying memory decay estimates and optimal revision intervals based on the Hermann Ebbinghaus model.

## Problem Statement
Students have no visual intuition of when their learned topics are about to enter the forgetting phase, making it hard to prioritize which subjects need urgent revision before exams.

## Current Behavior
Dashboard only displays aggregate quiz scores and flashcard count numbers without predictive retention curves or decay timelines.

## Expected Behavior
A dedicated "Memory Retention Hub" widget displays an interactive Ebbinghaus forgetting curve graph (D3.js / Recharts) predicting retention % for each topic and highlighting topics in the danger zone (<40% retention).

## User Story
As a student preparing for comprehensive exams
I want a visual retention decay curve of my learned topics
So that I can review topics right before I forget them to maximize long-term memory

## Proposed Solution
1. Create `frontend/src/components/analytics/MemoryDecayCurve.jsx` using `recharts` to plot theoretical retention $R = e^{-t/S}$ against student practice timestamps.
2. Develop `frontend/src/components/analytics/SyllabusHeatmap.jsx` displaying a GitHub-style colored calendar grid of revision intensity.
3. Add backend calculation endpoint `GET /api/progress/retention-matrix` computing decay metrics across all studied topics.

## Technical Scope

### Frontend Impact
Recharts / D3.js visualization components, tooltip breakdowns, filter by subject.

### Backend Impact
Add retention calculation service in `backend/src/services/retentionService.js`.

### Database Impact
Aggregate query across `FlashcardReview` and `TopicProgress` tables.

### API Impact
GET `/api/progress/retention-matrix`.

## Acceptance Criteria
- [ ] Curve updates dynamically as student completes new review sessions.
- [ ] Topics with predicted retention < 40% are flagged with an urgent revision badge.
- [ ] Chart is fully responsive across mobile and desktop screen widths.

## Testing Requirements

### Unit Tests
- [ ] Math formula verification test for Ebbinghaus $R = e^{-t/S}$ computation.

### Manual Testing
- [ ] Verify chart rendering with different date ranges and mock student profiles.

## Affected Areas
- [x] Frontend
- [x] Dashboard
- [x] Analytics

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
