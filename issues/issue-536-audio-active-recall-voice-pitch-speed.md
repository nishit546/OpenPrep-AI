---
title: '[FEAT]: Adaptive Spaced-Repetition Active Recall Audio Mode with Voice Pitch & Speed Controls'
labels: 'enhancement, flashcards, ai, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students studying on the go (commuting, walking, or resting their eyes) need hands-free audio review capabilities. Currently, flashcards in OpenPrep AI require active touch and visual reading on screen.

This feature implements an **Adaptive Spaced-Repetition Active Recall Audio Mode** featuring dynamic Web Speech API / TTS synthesis, customizable playback speeds (0.75x to 2.5x), audio pitch modulation, and optional voice-driven answer evaluation.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Audio Flashcard Player Engine (`frontend/src/components/flashcards/AudioFlashcardPlayer.jsx`)**:
   - Web Speech Synthesis API (`window.speechSynthesis`) integration with voice selector (natural sounding localized accents).
   - Audio controller widget with Play, Pause, Skip, Replay Question, and Speed/Pitch sliders.
   - Configurable pause intervals between question readout and answer revelation to allow active mental recall.
2. **Speech Recognition Input Mode (`frontend/src/components/flashcards/VoiceAnswerRecognizer.jsx`)**:
   - Web Speech Recognition API (`webkitSpeechRecognition`) allowing students to speak their answers.
   - Real-time confidence matching against flashcard back text using fuzzy Levenshtein distance.
3. **Hands-Free Commuter Control Overlay**:
   - Fullscreen minimal UI with large gesture zones (single tap: pause/play, swipe right: mark remembered, swipe left: mark review).

### Backend Architecture
1. **Audio Preferences Persistence**:
   - Persist user audio speed, default voice ID, and auto-advance delay in `UserSettings`.
2. **REST Endpoints**:
   - `PUT /api/users/preferences/audio` - Updates user TTS speed, pitch, and voice configuration.

---

## Acceptance Criteria
- [ ] Students can trigger "Audio Mode" for any flashcard deck with automatic question-answer speech playback.
- [ ] Users can adjust playback speed from 0.75x to 2.5x and pitch smoothly without audio distortion.
- [ ] Voice input mode captures student verbal responses and computes accuracy percentage.
- [ ] Fully responsive and works smoothly on mobile browsers with background audio session lock.
