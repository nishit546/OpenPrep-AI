---
title: '[FEAT]: High-Fidelity Neural Text-to-Speech (TTS) Flashcard Audio Player with Variable Speed & Pitch Controls'
labels: 'enhancement, frontend, ai, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Many students commute, exercise, or perform routine chores while wanting to review their flashcard decks. A visual-only flashcard interface prevents auditory and hands-free review, limiting the opportunities for passive spaced repetition.

This feature implements a **Neural Audio Flashcard Player & Hands-Free Audio Deck Mode** with configurable playback speed ($0.75\times - 2.5\times$), customizable voice accents, audio intervals between question and answer, and background playlist controls.

---

## Technical Scope & Architecture

### Frontend Audio Player & Synthesis
1. **Audio Synthesis Provider (`frontend/src/services/speechSynthesisService.js`)**:
   - Primary: High-fidelity Web Speech API synthesis with natural voice selection (Google US English, Microsoft Natural voices).
   - Fallback/Server-side: Cached cloud neural TTS audio generation for complex scientific terms and formulas.
2. **Hands-Free Audio Player Bar (`frontend/src/components/audio/AudioFlashcardPlayer.jsx`)**:
   - Media Session API integration (`navigator.mediaSession`): enables headphone play/pause/skip buttons, lock screen metadata, and background playback.
   - Configurable review cadence:
     - Term announcement -> user reflection pause (adjustable $1\text{s} - 10\text{s}$) -> Definition announcement -> 2s buffer -> next card.
   - Interactive speed selector ($0.75\times$, $1.0\times$, $1.25\times$, $1.5\times$, $2.0\times$, $2.5\times$) with pitch preservation.

---

## Acceptance Criteria
- [ ] Hands-free audio playback seamlessly cycles through flashcards with configurable pause durations.
- [ ] Hardware headphone media keys (Play, Pause, Next, Previous) control card progression.
- [ ] Supports variable playback speeds without robotic voice distortion or pitch artifacts.
- [ ] Continues audio playback when the mobile screen is locked or the browser tab is backgrounded.
