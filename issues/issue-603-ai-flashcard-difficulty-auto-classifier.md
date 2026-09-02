---
title: '[FEAT]: AI Flashcard Difficulty Auto-Classifier using Linguistic Complexity & Historical Cohort Failure Rates'
labels: 'enhancement, ai, flashcards, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When students create or import new flashcards, the default SM-2 algorithm assigns an arbitrary initial Ease Factor ($EF = 2.5$). Highly complex anatomical terms or multi-step organic mechanisms are penalized with the same baseline review frequency as trivial one-word definitions.

This feature introduces an **AI Flashcard Difficulty Auto-Classifier** that evaluates linguistic readability, formula density, and anonymized cohort error rates to assign optimal initial Ease Factors.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Linguistic & Structural Analyzer (`backend/services/cardDifficultyService.js`)**:
   - Calculates Flesch-Kincaid Grade Level and Dale-Chall readability scores on card text.
   - Analyzes formula complexity (number of LaTeX symbols, sub-indices, matrices).
   - Queries historical cohort failure rate percentiles for cards sharing the same topic tags.
   - Maps composite difficulty score $[0.0, 1.0]$ to initial SM-2 Ease Factor:
     $$EF_{\text{initial}} = 1.3 + (1 - \text{Difficulty}) \times 1.4$$
2. **REST Endpoints (`backend/controllers/flashcardClassificationController.js`)**:
   - `POST /api/flashcards/auto-classify` - Accepts flashcard front/back content and returns difficulty grade, key concepts, and suggested initial review intervals.

### Frontend Architecture
1. **Difficulty Indicator Badge (`frontend/src/components/flashcards/DifficultyBadge.jsx`)**:
   - Visual pill indicator on card preview (Easy: Green, Moderate: Amber, Challenging: Crimson, Hardcore: Purple) with breakdown tooltip explaining factors.

---

## Acceptance Criteria
- [ ] Correctly scores complex multi-clause formula cards with higher difficulty ratings than simple vocabulary terms.
- [ ] Dynamically adjusts initial Ease Factor between $1.30$ and $2.70$ based on calculated complexity.
- [ ] UI displays subtle difficulty rating badge during card creation and deck inspection.
- [ ] Unit tests verify readability formula calculations and edge-case symbol-heavy strings.
