---
title: '[FEAT]: AI-Generated Audio Flashcard Podcast & Daily Revision Newsfeed with Text-to-Speech Voice Selection'
labels: 'enhancement, ai, flashcards, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students commuting, exercising, or doing household chores cannot look at visual screens but still want to revise their daily study material. Audio-based active recall provides an effortless way to maintain daily consistency.

This feature introduces an **AI-Generated Audio Revision Podcast Engine** that synthesizes today's weak flashcards and key subject formulas into a 5-minute interactive audio dialogue with multi-voice text-to-speech.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Audio Script Generation Service (`backend/services/podcastScriptService.js`)**:
   - Gathers student's weak flashcards and due topics for the day.
   - Utilizes Gemini 1.5 to construct a dynamic, conversational script between two AI personas: "Tutor Alex" (explains concepts, poses questions) and "Student Sam" (answers, asks for clarifications).
2. **Text-to-Speech Audio Synthesizer (`backend/services/audioSynthesisService.js`)**:
   - Integrates with Web Speech API / Edge TTS / Google Cloud TTS to render multi-speaker audio tracks with distinct voices, pitch adjustments, and natural pauses.
   - Stitches audio chunks into a unified MP3 stream and caches audio files with TTL.
3. **REST Endpoints (`backend/controllers/audioPodcastController.js`)**:
   - `POST /api/audio-recap/generate` - Creates a tailored 3-to-7 minute audio recap script.
   - `GET /api/audio-recap/:id/stream` - Streams the synthesized audio file.

### Frontend Architecture
1. **Audio Podcast Player Drawer (`frontend/src/components/audio/AudioPodcastPlayer.jsx`)**:
   - Floating audio player bar with playback speed controls ($0.75\times$ to $2.0\times$), 10s skip forward/backward, and dynamic waveform visualizer.
   - Synchronized live karaoke-style transcript highlighting the spoken sentence in real time.
   - "Voice Selector" dropdown to customize narrator accent and pitch.

---

## Acceptance Criteria
- [ ] Generates coherent dual-speaker conversational audio recap from user's active flashcards within 8 seconds.
- [ ] Audio player streams smoothly with interactive scrubbing and synchronized transcript highlighting.
- [ ] Supports playback speed adjustment and background audio playback on mobile browsers.
- [ ] Unit tests verify script generation formatting and TTS service audio buffer concatenation.
