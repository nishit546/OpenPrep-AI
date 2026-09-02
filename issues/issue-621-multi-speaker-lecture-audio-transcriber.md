---
title: '[FEAT]: AI Multi-Speaker Lecture Audio Transcriber with Auto-Generated Chapter Bookmarks & Flashcards'
labels: 'enhancement, ai, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Students record lengthy classroom lectures and group discussions (45–90 minutes), but re-listening to raw audio is inefficient when preparing for exams. Raw speech-to-text outputs without speaker diarization or topic segmentation result in impenetrable walls of unformatted text.

This feature implements an **AI Lecture Audio Processing Pipeline** that ingests multi-speaker lecture recordings, performs speaker diarization (Professor vs Student Q&A), generates timestamped chapter bookmarks, extracts formulas/definitions, and synthesizes study flashcards.

---

## Technical Scope & Architecture

### Backend Audio & AI Processing Pipeline
1. **Audio Chunking & Transcription Worker (`backend/services/audioLectureWorker.js`)**:
   - Accepts audio formats (MP3, WAV, M4A, AAC) up to 100MB.
   - Chunks audio into 10-minute segments using `ffmpeg`.
   - Transcribes audio using Gemini Multimodal Audio API / Whisper with speaker diarization tags (`[Speaker 0: Professor]`, `[Speaker 1: Student]`).
2. **Lecture Chapterization & Extraction Service (`backend/services/lectureSummaryService.js`)**:
   - Identifies topic transitions and generates timestamped chapter markers (e.g. `12:40 - Derivation of Bernoulli Equation`).
   - Extracts key definitions, board notes, and auto-generates 10–15 high-yield flashcards per lecture.
3. **Endpoints (`backend/controllers/lectureAudioController.js`)**:
   - `POST /api/lectures/upload`: Uploads audio file and initiates asynchronous background processing.
   - `GET /api/lectures/:id/transcript`: Returns structured transcript with speaker tags, chapter bookmarks, and linked flashcards.

---

## Acceptance Criteria
- [ ] Successfully processes audio files up to 90 minutes via BullMQ background queue.
- [ ] Correctly distinguishes professor lectures from student questions with speaker labels.
- [ ] Generates clickable timestamped chapter bookmarks linked to an interactive audio player.
- [ ] Automatically synthesizes high-yield flashcard decks directly from the lecture transcript.
