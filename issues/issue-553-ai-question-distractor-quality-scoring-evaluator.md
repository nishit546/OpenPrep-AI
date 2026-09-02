---
title: '[FEAT]: Intelligent Question Distractor Quality Scoring & Plausibility Metric'
labels: 'enhancement, ai, quiz-system, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Poorly designed multiple-choice questions often contain obviously fake wrong answers (distractors), making it easy for students to guess the right answer by process of elimination without actual understanding. Competitive exams require plausible distractors based on common student misconceptions.

This feature creates an **Intelligent Question Distractor Quality Scoring & Plausibility Metric Engine**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Distractor Evaluation Engine (`backend/services/distractorScorerService.js`)**:
   - Evaluates AI-generated and user-created question distractors using multi-point heuristic criteria:
     - **Plausibility Score (0-100)**: Does the wrong option reflect a known conceptual misunderstanding or sign error in calculation?
     - **Grammar & Length Symmetry**: Are all options similar in length and grammatical structure to avoid visual giveaways?
     - **Clue Leakage Detection**: Ensures no option contains "dead giveaway" words (e.g. "always", "never", or hints to other options).
2. **Distractor Auto-Enhancer**:
   - If an option scores low plausibility, Gemini API suggests 3 mathematically derived alternative distractors.
3. **REST Endpoints**:
   - `POST /api/quiz/evaluate-distractors` - Evaluates questions and returns diagnostic quality scores.

### Frontend Architecture
1. **Question Quality Diagnostic Panel (`frontend/src/components/quiz/QuestionQualityBadge.jsx`)**:
   - Visual gauge showing distractor quality rating with actionable suggestions for test creators.

---

## Acceptance Criteria
- [ ] Accurately identifies low-quality or obvious distractors in multiple-choice questions.
- [ ] Provides AI-suggested alternative options based on realistic calculation mistakes.
- [ ] Visual quality breakdown helps educators refine exam questions before publishing.
