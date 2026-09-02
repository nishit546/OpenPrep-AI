---
title: '[FEAT]: Real-Time Exam Countdown Velocity Meter & Daily Target Hours Calculator'
labels: 'enhancement, study-planner, dashboard, frontend, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Students preparing for milestone examinations often experience anxiety because they do not know whether their current daily study hours are sufficient to cover the remaining syllabus before exam day.

This feature adds a **Real-Time Exam Countdown Velocity Meter & Daily Target Hours Calculator** to the OpenPrep AI dashboard.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Live Exam Countdown Tile (`frontend/src/components/dashboard/ExamCountdownCard.jsx`)**:
   - Animated countdown clock showing Days, Hours, Minutes, and Seconds until target exam date.
   - Configurable milestone dates for multiple target exams (e.g. Mains, Advanced, Mock Series).
2. **Velocity & Required Daily Hours Meter (`frontend/src/components/dashboard/StudyVelocityMeter.jsx`)**:
   - Gauge visualization displaying:
     - **Current Velocity**: Average hours logged per day over the past 14 days.
     - **Required Velocity**: Dynamic calculation of required hours/day to complete unmastered topics.
     - **Pace Status**: "On Track" (Green), "Moderate Risk" (Amber), or "Critical Pace Deficit" (Red).
3. **Adjustable Study Pace Simulator**:
   - Interactive slider allowing students to simulate: "If I study 4 hrs/day instead of 2 hrs/day, when will I finish syllabus revision?"

### Backend Architecture
1. **Velocity Calculation Logic (`backend/services/studyVelocityService.js`)**:
   - Computes syllabus completion velocity based on topic estimated durations, difficulty ratings, and logged study session times.
2. **REST Endpoints**:
   - `GET /api/study-planner/velocity-summary` - Returns current velocity, required velocity, and target milestones.

---

## Acceptance Criteria
- [ ] Live countdown displays accurate remaining time to user's specified exam date.
- [ ] Dynamically calculates required study hours/day based on remaining uncompleted syllabus items.
- [ ] Interactive simulator updates projected completion date in real time when slider is adjusted.
