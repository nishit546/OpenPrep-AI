---
title: '[FEAT]: AI-Powered Mock Viva Voce & Technical Oral Exam Examiner with Speech Synthesis'
labels: 'enhancement, ai, frontend, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
University practical exams, medical board vivas, and engineering thesis defenses require students to articulate technical concepts verbally under pressure. Most prep platforms only offer multiple-choice quizzes, leaving students unprepared for verbal cross-examination.

This feature implements an **AI-Powered Mock Viva Voce Simulator** that speaks technical questions, listens to verbal responses, evaluates concept depth, and conducts dynamic follow-up questioning.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Viva Examiner Interface (`frontend/src/components/viva/VivaExamRoom.jsx`)**:
   - Realistic examiner avatar with animated speech indicators and audio waveform visualizer.
   - Web Speech API (`SpeechSynthesis`) audio question readout with natural pacing and accent options.
   - Push-to-talk / Voice-activity-detection (VAD) audio recorder capturing student responses.
2. **Live Transcription & Answer Canvas**:
   - Real-time Speech-to-Text captioning showing transcribed student speech for confirmation.
   - Follow-up question dialogue history thread.
3. **Viva Performance Scorecard & Rubric Analysis**:
   - Post-session evaluation report grading Technical Accuracy, Conceptual Clarity, Vocabulary Precision, and Answer Conciseness.

### Backend Architecture
1. **Dynamic Viva Dialogue Engine (`backend/services/vivaExaminerService.js`)**:
   - Multi-turn conversation state tracking student syllabus, difficulty level, and prior answers.
   - Generates probing follow-up questions when a student's answer is vague or incomplete.
2. **REST Endpoints (`backend/controllers/vivaController.js`)**:
   - `POST /api/viva/start` - Initializes viva session for selected subject and topic.
   - `POST /api/viva/respond` - Ingests student verbal response transcript; returns examiner verdict and next question.
   - `POST /api/viva/finish` - Finalizes score report and saves feedback in student portfolio.

---

## Acceptance Criteria
- [ ] Students can conduct a full 5 to 10 question oral examination using microphone and speakers.
- [ ] The AI examiner dynamically probes deeper when student answers are incomplete.
- [ ] Comprehensive rubric score and detailed feedback generated at end of session.
- [ ] Cross-browser support for Chrome, Edge, Safari, and Firefox.
