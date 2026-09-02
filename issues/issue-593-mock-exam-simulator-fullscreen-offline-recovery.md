---
title: '[FEAT]: Interactive Mock Exam Simulator with Full-Screen Lock, Sectional Timers & Auto-Save Recovery'
labels: 'enhancement, quiz-system, frontend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Actual competitive examinations (e.g. JEE Main, NEET, SAT, GRE, GATE, USMLE) operate under strict environmental conditions: unchangeable sectional timers, question status palettes (Answered, Marked for Review, Unvisited), and strict anti-distraction policies.

This feature creates a **Proctored Mock Exam Simulator** that mirrors actual testing conditions, complete with full-screen enforcement, sectional time locks, and robust IndexedDB auto-save crash recovery.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Full-Screen Exam Arena (`frontend/src/components/exam/MockExamArena.jsx`)**:
   - Fullscreen API lock with warning modals upon window blur, tab switching, or exit attempts (configurable count limit).
   - Split view: Question Display (with zoomable diagrams and formula rendered in KaTeX) and Question Palette navigation grid.
   - Color-coded question states: Green (Answered), Purple (Marked for Review), Violet+Dot (Answered & Marked for Review), Grey (Unvisited), Red (Not Answered).
2. **Sectional Timer Controller (`frontend/src/components/exam/SectionalTimer.jsx`)**:
   - Independent countdown timers per section (e.g., Physics: 60m, Chemistry: 60m, Mathematics: 60m) with auto-submission upon timer expiry.
3. **Offline State Persistence Engine (`frontend/src/utils/examIndexedDBSync.js`)**:
   - Persists all question responses, bookmarks, and elapsed time locally into IndexedDB every 5 seconds.
   - If the browser crashes, computer restarts, or Wi-Fi drops, the exam state recovers instantly with zero data loss upon reopening.

### Backend Architecture
1. **Exam Session State Synchronizer (`backend/controllers/mockExamController.js`)**:
   - `POST /api/mock-exams/:id/start` - Secures exam start timestamp on server to prevent client-side clock tampering.
   - `POST /api/mock-exams/:sessionId/heartbeat` - Periodic sync payload updating server-side answer state.
   - `POST /api/mock-exams/:sessionId/submit` - Grades full mock attempt and produces sectional percentile scorecard.

---

## Acceptance Criteria
- [ ] Fullscreen mode locks into place and tracks tab-switch violations accurately.
- [ ] Sectional timers transition automatically to the next section when time expires.
- [ ] IndexedDB seamlessly restores all selected answers and remaining time after intentional page refresh.
- [ ] Playwright E2E test verifying full mock exam workflow, tab-switch warnings, and final scorecard generation.
