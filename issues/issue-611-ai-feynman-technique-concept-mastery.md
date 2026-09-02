---
title: '[FEAT]: AI-Powered Socratic Feynman Technique Explainer & Concept Mastery Evaluation Engine'
labels: 'enhancement, ai, fullstack, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
The Feynman Technique is one of the most effective study methodologies: explaining a complex concept in plain, jargon-free language to reveal gaps in one's understanding. However, students studying alone lack an expert listener who can identify hidden assumptions, hand-waving explanations, or factual inaccuracies.

This feature introduces an **Interactive Feynman Technique Socratic Coach** powered by Google Gemini AI. Students explain a topic in their own words (via voice or text), and the AI evaluates their explanation, detects confusing jargon or conceptual voids, asks targeted Socratic probing questions, and produces an intuitive ELI5 (Explain Like I'm 5) analogy.

---

## Technical Scope & Architecture

### Backend Architecture & AI Pipelines
1. **Feynman Evaluation Pipeline (`backend/services/feynmanService.js`)**:
   - Analyzes student explanations using Gemini 1.5 with structured JSON schema output:
     - `masteryScore`: Numerical score (0–100) evaluating clarity, completeness, and factual correctness.
     - `jargonDetected`: List of specialized terms used without definition or intuition.
     - `conceptualGaps`: Specific prerequisites or logical links missed in the explanation.
     - `socraticChallenge`: A probing question nudging the student to explain the missing piece.
     - `simplifiedAnalogy`: A real-world visual metaphor illustrating the concept.
2. **Feynman Mastery Session Controller (`backend/controllers/feynmanController.js`)**:
   - `POST /api/feynman/start` - Initializes a Feynman coaching session for a selected topic or syllabus node.
   - `POST /api/feynman/submit-step` - Processes student explanation iteration and returns the updated Socratic dialogue.
   - `GET /api/feynman/history/:sessionId` - Fetches prior dialogue rounds and mastery progression.

### Frontend Architecture & User Interface
1. **Interactive Feynman Studio (`frontend/src/components/feynman/FeynmanStudio.jsx`)**:
   - Dual-pane layout: Left pane displays the student's explanation scratchpad with live speech-to-text input and word complexity indicators.
   - Right pane displays the AI Socratic Partner card with conversational chat bubbles, interactive follow-up prompts, and real-time concept mastery progress rings.
2. **Concept Gap Visualizer (`frontend/src/components/feynman/ConceptGapMap.jsx`)**:
   - Visual breakdown showing nodes of the concept: green (solidly understood), yellow (partially grasped), red (unaddressed gap).

---

## Acceptance Criteria
- [ ] Students can initiate a Feynman session for any syllabus topic with text or voice dictation.
- [ ] AI accurately identifies undefined jargon and flags logical gaps with Socratic questions.
- [ ] Generates real-world ELI5 analogies tailored to the student's target subject.
- [ ] Tracks mastery score improvements over multiple iterative explanation attempts.
- [ ] Full unit test coverage for prompt parsing and session state transitions.
