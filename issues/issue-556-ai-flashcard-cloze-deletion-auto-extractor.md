---
title: '[FEAT]: AI-Powered Flashcard Cloze Deletion (Fill-in-the-Blank) Auto-Extractor'
labels: 'enhancement, ai, flashcards, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Cloze deletion (fill-in-the-blank) flashcards are one of the most effective techniques for memorizing medical terminology, historical dates, legal definitions, and chemical formulas. Manually creating cloze deletions from textbook paragraphs is tedious.

This feature implements an **AI-Powered Cloze Deletion Auto-Extractor & Interactive Study Card UI**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Cloze Extraction NLP Pipeline (`backend/services/clozeExtractionService.js`)**:
   - Ingests raw text or study notes and prompts Gemini API with specialized cloze extraction schemas.
   - Automatically identifies key keywords, numbers, formula names, and dates, formatting them into Anki-style cloze syntax: `{{c1::keyword}}`.
2. **REST Endpoints**:
   - `POST /api/flashcards/generate-cloze` - Generates cloze flashcards from text paragraphs with customizable mask density (Light, Medium, Dense).

### Frontend Architecture
1. **Interactive Cloze Card UI (`frontend/src/components/flashcards/ClozeFlashcard.jsx`)**:
   - Renders blurred or masked clickable chips `[ ... ]` for hidden words.
   - Clicking a masked chip reveals the hidden word with smooth flip animation.
   - Keyboard shortcut (`Space` / `Enter`) to reveal next mask sequentially.

---

## Acceptance Criteria
- [ ] Ingests study text and automatically creates structured cloze deletion flashcards.
- [ ] Cloze chips remain masked until clicked or toggled via keyboard shortcuts.
- [ ] Cloze cards integrate seamlessly into the standard SM-2 spaced repetition review queue.
