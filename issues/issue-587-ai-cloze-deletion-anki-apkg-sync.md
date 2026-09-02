---
title: '[FEAT]: AI-Powered Flashcard Cloze Deletion & Anki Import/Export (.apkg) with Media Attachment Preservation'
labels: 'enhancement, flashcards, ai, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Millions of medical and STEM students already have extensive Anki flashcard libraries (`.apkg` collections) with embedded audio, diagrams, and Cloze deletions (`{{c1::key term}}`). Currently, migrating between OpenPrep AI and Anki requires tedious manual copying, losing formatting and spaced repetition histories.

This feature implements a **Bidirectional Anki (.apkg) Import/Export Engine** with automated AI Cloze Deletion extraction from textbook notes.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Anki Import / Export Modal (`frontend/src/components/flashcards/AnkiSyncModal.jsx`)**:
   - Drag-and-drop `.apkg` archive uploader with archive inspection summary (number of cards, media count, deck hierarchy).
   - Export configuration selector: OpenPrep native cards $\rightarrow$ Anki `.apkg` with custom tags, SM-2 retention metrics, and embedded audio.
2. **Interactive Cloze Editor (`frontend/src/components/flashcards/ClozeEditor.jsx`)**:
   - WYSIWYG highlight-to-cloze shortcut (`Ctrl+Shift+C`) to convert selected text into numbered cloze markers (`{{c1::...}}`, `{{c2::...}}`).
   - "AI Auto-Cloze" button utilizing Gemini to detect high-yield definitions, dates, and formulas.

### Backend Architecture
1. **Anki APKG Parser & Packager (`backend/services/ankiPackageService.js`)**:
   - Unzips SQLite database (`collection.anki2` / `collection.anki21`) from `.apkg` archive.
   - Parses note models, cards, deck configurations, and maps media hashes from `media` JSON dictionary to uploaded assets.
   - Generates valid, compliant SQLite tables and zips assets back into standards-compliant `.apkg` bundles for export.
2. **AI Cloze Extraction Service (`backend/services/clozeExtractionService.js`)**:
   - Analyzes raw study text and generates structured cloze cards with hint text: `{{c1::Photosynthesis::Process}}`.
3. **REST Endpoints (`backend/controllers/ankiController.js`)**:
   - `POST /api/flashcards/anki/import` - Multi-part file upload processing `.apkg` and creating decks.
   - `GET /api/flashcards/anki/export/:deckId` - Streams generated `.apkg` binary download.
   - `POST /api/flashcards/ai/generate-cloze` - Generates cloze flashcards from user study notes.

---

## Acceptance Criteria
- [ ] Successfully parses standard Anki 2.1 `.apkg` decks including basic and cloze note types.
- [ ] Preserves all images, LaTeX formulas, and audio clips during import and export cycles.
- [ ] "AI Auto-Cloze" detects and brackets key domain terms accurately from input paragraphs.
- [ ] Jest integration tests verify SQLite schema extraction and zip integrity of exported packages.
