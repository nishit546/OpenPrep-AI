---
title: '[FEAT]: Interactive Audio Flashcard Podcast Generator for Subtopics with Ambient Background Beats'
labels: 'enhancement, ai, flashcards, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Audio learning is highly effective for auditory retention. Instead of robotic text-to-speech, students benefit from cohesive, conversational podcast-style audio summaries that interweave flashcard concepts with ambient background beats for focused learning.

This feature introduces an **AI Audio Flashcard Podcast Generator with Ambient Lo-Fi & Focus Beats**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Podcast Script Synthesis Engine (`backend/services/audioPodcastService.js`)**:
   - Ingests flashcard deck content and prompts Gemini API to structure a 3-5 minute conversational review dialogue between two AI study hosts (Host A: Explainer, Host B: Inquisitive Student).
2. **Multi-Voice Audio Mixing Pipeline**:
   - Converts dialogue into multi-voice speech using neural TTS voices.
   - Mixes voice audio with user-selected background ambient tracks (Lo-Fi Study Beats, Rainy Window, Binaural Alpha Waves) using `fluent-ffmpeg`.
3. **REST Endpoints**:
   - `POST /api/flashcards/:deckId/generate-podcast` - Queues podcast generation job.
   - `GET /api/flashcards/podcasts/:id` - Retrieves audio file URL and timestamped transcript.

### Frontend Architecture
1. **Interactive Podcast Player Widget (`frontend/src/components/audio/AudioPodcastPlayer.jsx`)**:
   - Sleek glassmorphic audio player with audio visualizer waveform, ambient music volume slider, and interactive synchronized transcript.

---

## Acceptance Criteria
- [ ] Converts any flashcard deck into a multi-voice conversational audio podcast in under 60 seconds.
- [ ] Integrates background ambient music tracks with independent volume mixing.
- [ ] Synchronized transcript highlights spoken lines in real time during playback.
