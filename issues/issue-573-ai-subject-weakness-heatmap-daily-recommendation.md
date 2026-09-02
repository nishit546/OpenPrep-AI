---
title: '[FEAT]: AI-Driven Subject Weakness Heatmap & Daily Revision Recommendation Engine'
labels: 'enhancement, ai, study-planner, dashboard, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students preparing for exams often fall into the trap of repeatedly studying topics they already know well while neglecting challenging concepts. Without automated diagnostic feedback, syllabus blind spots remain unaddressed until exam day.

This feature implements an **AI Subject Weakness Heatmap and Intelligent Daily Revision Action Card Engine**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Student Topic Mastery Evaluation Engine (`backend/services/weaknessEngine.js`)**:
   - Calculates weighted Mastery Score $M in [0, 100]$ for each syllabus topic using:
     - Quiz accuracy on topic-specific questions ($40%$).
     - Spaced repetition retention stability & forgotten card frequency ($30%$).
     - Days elapsed since last active review ($20%$).
     - Historical PYQ exam weightage of the chapter ($10%$).
   - Categorizes topics into **Critical Vulnerability** ($<40%$), **Moderate** ($40-75%$), and **Mastered** ($>75%$).
2. **Daily Action Recommendation Generator**:
   - Generates 3 high-impact daily study targets: e.g., *"Review Organic Chemistry Reaction Mechanisms (Accuracy 32% - High Exam Weightage)"*.
3. **REST Endpoints (`backend/controllers/weaknessAnalyticsController.js`)**:
   - `GET /api/analytics/weakness-heatmap/:subjectId` - Returns hierarchical topic tree with calculated mastery scores.
   - `GET /api/analytics/daily-recommendations` - Returns prioritized action items for the day.

### Frontend Architecture
1. **Interactive Mastery Heatmap Grid (`frontend/src/components/dashboard/SubjectWeaknessHeatmap.jsx`)**:
   - Color-coded matrix grid (Red -> Amber -> Green) with chapter breakdown.
   - Hover tooltips showing quiz accuracy stats, cards due, and last studied timestamp.
2. **"Fix My Weaknesses" One-Click Quick Action**:
   - Button that instantly generates a targeted 10-question diagnostic quiz focused exclusively on the student's weakest topics.

---

## Acceptance Criteria
- [ ] Heatmap visualizes student mastery across all enrolled subjects with smooth color transitions.
- [ ] Daily recommendations dynamically update based on new quiz results and flashcard reviews.
- [ ] One-click "Targeted Weakness Quiz" launches seamlessly with topic-specific questions.
- [ ] Unit tests for mastery score weighting formula.
