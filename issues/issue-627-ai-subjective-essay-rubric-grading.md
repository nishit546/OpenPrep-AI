---
title: '[FEAT]: AI Subjective Answer Grader with Multi-Criteria Rubric Scoring & Inline Annotations'
labels: 'enhancement, ai, fullstack, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
While multiple-choice quizzes test factual recall, university semester exams and national civil service / AP tests evaluate subjective long-form essays, case studies, and mathematical proof structures. Students currently have no scalable way to receive rapid, criteria-based feedback on subjective essay drafts.

This feature introduces an **AI Long-Form Subjective Answer Grader** that evaluates student submissions against customizable multi-criteria rubrics (Content Accuracy, Structure & Flow, Evidence/Citations, Terminology, Grammar) and delivers detailed inline annotations.

---

## Technical Scope & Architecture

### Backend Rubric & AI Evaluation Pipeline
1. **Rubric Evaluation Engine (`backend/services/rubricGraderService.js`)**:
   - Accepts prompt question, model answer / marking scheme, and student response (text or OCR scan).
   - Evaluates response against 5 distinct rubric dimensions (0–10 points each) using Gemini 1.5 Pro:
     - **Conceptual Accuracy & Depth**
     - **Coherence & Argument Structure**
     - **Terminology & Vocabulary Precision**
     - **Evidence & Supporting Examples**
     - **Grammar, Tone & Formatting**
   - Returns token offsets for inline highlighting and constructive improvement notes.
2. **Subjective Grading Controller (`backend/controllers/essayGradeController.js`)**:
   - `POST /api/essays/grade`: Initiates rubric assessment and stores historical evaluation records.
   - `GET /api/essays/:id/report`: Retrieves visual rubric radar chart and annotated essay text.

---

## Acceptance Criteria
- [ ] Evaluates subjective essays (up to 2,500 words) against structured multi-dimensional rubrics.
- [ ] Returns inline highlighted spans with specific constructive critique annotations.
- [ ] Generates visual rubric score radar chart breakdown comparing score against model answers.
- [ ] Supports custom rubric definitions set by teachers or standard exam boards.
