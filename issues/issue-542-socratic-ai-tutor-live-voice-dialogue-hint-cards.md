---
title: '[FEAT]: Socratic AI Tutor Live Voice Dialogue Interface with Speech-to-Text & Instant Visual Hint Cards'
labels: 'enhancement, ai, quiz-system, frontend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
When students get stuck on difficult questions during practice, giving away direct answers prevents deep learning. A Socratic tutoring model that asks guiding questions and provides tiered hints helps students reach the solution independently.

This feature implements a **Socratic AI Tutor Live Voice Dialogue Interface with Instant Visual Hint Cards**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Socratic Dialogue Engine (`backend/services/socraticTutorService.js`)**:
   - Multi-turn conversational prompt orchestration with Gemini API enforcing Socratic pedagogical rules (never reveal answer outright; diagnose misconception; provide Level 1: Conceptual clue, Level 2: Formula hint, Level 3: Step-by-step breakdown).
2. **Contextual Knowledge Injection**:
   - Feeds question stem, options, subject syllabus context, and student's prior incorrect attempts into the prompt payload.
3. **REST Endpoints**:
   - `POST /api/tutor/socratic-hint` - Ingests current question state and student voice/text prompt, returning next Socratic guidance step.

### Frontend Architecture
1. **Interactive Tutor Floating Drawer (`frontend/src/components/quiz/SocraticTutorDrawer.jsx`)**:
   - Slide-out tutor chat interface with voice speech input and audio voice-back.
   - Tiered "Hint Cards" that unlock progressively on request.
2. **Formula & Diagram Callout Chips**:
   - Displays relevant formula flashchips alongside tutor dialogue when mathematical concepts are referenced.

---

## Acceptance Criteria
- [ ] Socratic tutor guides students without leaking the correct option answer.
- [ ] Supports real-time speech input and natural audio response playback.
- [ ] Tiered hint cards reveal progressive levels of assistance based on student request.
