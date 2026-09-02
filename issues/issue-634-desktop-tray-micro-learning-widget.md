---
title: '[FEAT]: Daily Micro-Learning Study Widget & System Tray Mini-Companion for Quick Review'
labels: 'enhancement, frontend, fullstack, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Setting aside 2-hour uninterrupted study blocks is difficult for busy working students. Micro-learning—answering 1 question or reviewing 1 high-yield formula every hour throughout the day—reinforces spaced recall without demanding intense mental context switching.

This feature creates a **Lightweight Micro-Learning Desktop / Browser Extension Widget** that prompts students with a single, bite-sized quiz question or high-yield flashcard at scheduled intervals right from their desktop tray or browser toolbar.

---

## Technical Scope & Architecture

### Desktop & Mini-App Architecture
1. **Compact Micro-Widget Component (`frontend/src/components/widgets/MicroReviewModal.jsx`)**:
   - Ultra-compact floating card ($360\text{px} \times 240\text{px}$) optimized for minimal distraction.
   - Shows 1 question due for spaced repetition review with 4 fast-click MCQ options or flip card.
   - Instant feedback with 2-sentence explanation and auto-dismiss after 5 seconds.
2. **Notification & Scheduling Trigger (`frontend/src/services/microScheduleWorker.js`)**:
   - Web Notification API / Service Worker alarm periodically checks pending review cards.
   - Configurable trigger frequencies: Every 30 mins, 60 mins, 2 hours, or on new tab creation.
3. **Micro-Attempt Sync API (`backend/controllers/microLearnController.js`)**:
   - `GET /api/micro/next-due-card`: Returns single highest priority card due for review in $< 30\text{ms}$.
   - `POST /api/micro/submit-answer`: Records micro-attempt, updates streak XP, and recalibrates FSRS schedule.

---

## Acceptance Criteria
- [ ] Lightweight mini-widget renders in $< 100\text{ms}$ with zero layout shift.
- [ ] Browser notifications deliver periodic micro-quizzes with inline interactive response buttons.
- [ ] Seamlessly syncs answer attempts back to the main user profile and study streak.
- [ ] Allows customizable quiet hours and frequency toggles to avoid disrupting classes or work.
