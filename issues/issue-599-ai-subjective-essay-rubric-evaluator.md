---
title: '[FEAT]: AI Essay & Long-Form Answer Evaluation Engine with Rubric-Based Scoring & Grammatical Feedback'
labels: 'enhancement, ai, pyq-analysis, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Many competitive examinations (UPSC, AP English, IELTS, GRE Analytical Writing, University Semester Exams) require long-form essay and descriptive subjective answers. Unlike MCQs, students receive no automated feedback on argumentation, thesis clarity, or rubric adherence.

This feature introduces an **AI Essay & Subjective Answer Evaluation Engine** providing rubric-based multi-criteria scoring, thesis analysis, and constructive paragraph-by-paragraph feedback.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Rubric Evaluation Service (`backend/services/essayEvaluatorService.js`)**:
   - Structured prompt schema utilizing Gemini 1.5 Pro to evaluate submitted essays against customizable rubrics:
     * **Thesis & Argumentation (25%)**: Logic flow, claim strength, and counter-argument handling.
     * **Evidence & Support (25%)**: Relevance of examples, factual grounding, and citations.
     * **Structure & Coherence (25%)**: Paragraph transitions, introduction/conclusion effectiveness.
     * **Language & Mechanics (25%)**: Vocabulary variety, grammar, punctuation, and tone.
   - Generates JSON response with overall score, criterion sub-scores, inline annotations, and actionable rewrite recommendations.
2. **REST Endpoints (`backend/controllers/essayController.js`)**:
   - `POST /api/essays/evaluate` - Submits essay text + prompt/rubric for comprehensive AI evaluation.
   - `GET /api/essays/history` - Returns historical essay submissions and score progression charts.

### Frontend Architecture
1. **Essay Writing Sandbox (`frontend/src/components/essay/EssayWritingArena.jsx`)**:
   - Distraction-free text editor with live word count, character count, and optional timed exam countdown.
2. **Rubric Scorecard & Annotation Drawer (`frontend/src/components/essay/EssayScorecard.jsx`)**:
   - Radar chart displaying performance across the 4 core rubric criteria.
   - Interactive essay review with highlighted sentences showing positive praise (green) and improvement suggestions (yellow/blue).

---

## Acceptance Criteria
- [ ] Evaluates subjective essays (300-1500 words) and returns structured rubric evaluations within 6 seconds.
- [ ] Highlights specific sentences with contextual improvement suggestions and grammar corrections.
- [ ] Radar chart visually represents strengths and weaknesses across rubric dimensions.
- [ ] Unit tests verify JSON schema validation and handling of edge-case short or off-topic submissions.
