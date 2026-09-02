---
title: '[FEAT]: Interactive Chapter Weightage Bubble Chart & Weakness Radar Visualization'
labels: 'enhancement, frontend, dashboard, analytics, good first issue, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Students need an immediate, intuitive bird's-eye view of where their study time will have the highest return on investment (ROI). Knowing a topic has 15% exam weightage while your mastery is only 20% identifies an urgent priority.

This feature adds an **Interactive Chapter Weightage Bubble Chart & Multi-Dimensional Weakness Radar**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Weightage Bubble Chart (`frontend/src/components/analytics/WeightageBubbleChart.jsx`)**:
   - D3.js / Chart.js bubble chart where:
     - **X-axis**: Topic Weightage in Exam (0% to 20%).
     - **Y-axis**: Student Mastery Level (0% to 100%).
     - **Bubble Size**: Total Questions in Database.
     - **Bubble Color**: Priority Zone (Green = Mastered High-Yield, Red = Critical Danger Zone, Yellow = Low Yield).
2. **Multi-Subject Mastery Radar (`frontend/src/components/analytics/SubjectMasteryRadar.jsx`)**:
   - 6-8 axis radar polygon chart comparing student accuracy across different subject domains against benchmark topper averages.

### Backend Architecture
1. **Analytics Aggregator Endpoint**:
   - `GET /api/analytics/weightage-matrix` - Computes combined metrics of syllabus weightage, student quiz history, and accuracy.

---

## Acceptance Criteria
- [ ] Bubble chart plots all subject topics categorized into 4 actionable priority quadrants.
- [ ] Radar chart dynamically reflects changes when new quizzes are completed.
- [ ] Fully responsive with interactive tooltips displaying topic stats on hover.
