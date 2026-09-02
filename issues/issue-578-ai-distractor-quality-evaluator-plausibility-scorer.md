---
title: '[FEAT]: AI Distractor Quality Evaluator & Plausibility Scorer for Multiple-Choice Questions'
labels: 'enhancement, ai, quiz-system, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When generating multiple-choice quizzes, low-quality AI prompts often produce trivial or absurd wrong answer choices ("distractors"). Obvious giveaways allow students to guess the correct answer by elimination without mastering the underlying concept.

This feature implements an **Automated Distractor Quality Evaluator & Plausibility Scorer** for the quiz generation pipeline.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Distractor Evaluation Engine (`backend/services/distractorEvaluator.js`)**:
   - Evaluates each multiple-choice question against psychometric exam standards:
     - **Option Length Symmetry**: Ensures the correct answer is not disproportionately longer or more detailed than distractors.
     - **Semantic Plausibility**: Computes semantic embedding similarity between question stem and options to ensure all distractors represent common student misconceptions.
     - **Absoluteness Detection**: Flags extreme distractor keywords ("always", "never", "all of the above") that signal weak questions.
2. **Automatic Regeneration Loop**:
   - If a generated question fails quality scoring (Plausibility Index $< 0.75$), the pipeline automatically requests Gemini to replace the weak distractors with plausible alternatives.
3. **Admin Diagnostic View**:
   - Returns distractor quality metrics in quiz generation debug payloads.

---

## Acceptance Criteria
- [ ] All AI-generated quiz questions pass automated distractor plausibility validation before being presented to users.
- [ ] Distractor options exhibit balanced lengths and avoid giveaway phrasing.
- [ ] System automatically regenerates low-scoring distractors with zero user interruption.
- [ ] Unit tests covering distractor symmetry, similarity scoring, and keyword heuristics.
