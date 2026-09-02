---
title: '[FEAT]: AI Flashcard Auto-Deck Generator from YouTube Lecture URLs & Timestamps'
labels: 'enhancement, ai, flashcards, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students spend hours watching educational video lectures on YouTube (e.g. MIT OpenCourseWare, Khan Academy, CrashCourse, NPTEL) but struggle to retain key concepts without active recall. Manually creating flashcards while pausing videos disrupts study flow.

This feature implements an **AI Flashcard Auto-Deck Generator from YouTube URLs** that ingests lecture transcripts, sections content by video chapters, and generates review-ready spaced repetition flashcards linked to exact timestamps.

---

## Technical Scope & Architecture

### Backend Architecture
1. **YouTube Ingestion & Transcript Extractor (`backend/services/youtubeService.js`)**:
   - Extracts YouTube Video ID, metadata (title, channel, duration, chapter markers) via YouTube Data API / `youtube-transcript`.
   - Parses timed caption tracks with language fallback and tokenization.
2. **AI Flashcard Distillation Pipeline (`backend/services/aiFlashcardExtractor.js`)**:
   - Chunks transcript segments into coherent semantic modules based on timestamp chapter markers.
   - Prompts Gemini 1.5 to generate high-yield question-answer pairs, definitions, and formulas tagged with the video timestamp.
3. **REST Endpoints (`backend/controllers/youtubeFlashcardController.js`)**:
   - `POST /api/flashcards/generate-from-youtube` - Ingests YouTube URL, fetches transcript, and streams AI generated flashcard objects.
   - `POST /api/flashcards/save-youtube-deck` - Persists generated deck into user's flashcard library with video reference links.

### Frontend Architecture
1. **YouTube Ingestion Modal (`frontend/src/components/flashcards/YouTubeDeckModal.jsx`)**:
   - URL input with instant video preview thumbnail, title, and detected chapter list.
   - Granular options: "Generate full lecture", "Generate specific chapters", or "Card count limit".
2. **Flashcard Preview & Editor with Timestamp Player**:
   - Interactive preview table allowing students to edit card front/back and click a timestamp to jump directly to that point in an embedded YouTube player.

---

## Acceptance Criteria
- [ ] Users can paste any valid YouTube educational video link with captions and generate 10-30 high-quality flashcards.
- [ ] Each generated flashcard contains a clickable timestamp linking directly to the relevant video moment.
- [ ] Robust error handling for videos without closed captions or private/restricted videos.
- [ ] Full unit test coverage for YouTube URL regex parsing and transcript chunking logic.
