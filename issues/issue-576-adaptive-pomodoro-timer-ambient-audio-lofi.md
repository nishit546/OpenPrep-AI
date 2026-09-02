---
title: '[FEAT]: Adaptive Pomodoro Timer with Brain-Wave Ambient Audio & Lofi Focus Backgrounds'
labels: 'enhancement, frontend, ui/ux, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Maintaining sustained focus during multi-hour exam study marathons is difficult. Students benefit from the proven Pomodoro Technique (25m study / 5m break) combined with calming ambient background noise (lofi beats, rain, binaural focus frequencies) to enter deep work states.

This feature adds a **Full-Screen Adaptive Pomodoro Focus Mode with Built-In Ambient Soundscapes**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Focus Mode Timer Overlay (`frontend/src/components/pomodoro/PomodoroModal.jsx`)**:
   - Circular countdown progress ring with custom cycle options (25/5 Standard, 50/10 Deep Work, or Custom Intervals).
   - Audio chimes and browser desktop notifications when focus/break sessions complete.
   - Minimalist zen mode hiding all distracting navigation elements.
2. **Web Audio Ambient Synthesizer (`frontend/src/services/ambientAudioService.js`)**:
   - Multi-track audio mixer: Rain, Campfire, Coffee Shop, White Noise, Alpha Wave (40Hz Binaural Beat), and Lofi Piano.
   - Independent volume sliders allowing students to create customized ambient sound mixes.
3. **Session Logging & Daily Progress Integration**:
   - Automatically records completed focus intervals and adds tracked study minutes to student daily activity logs.

---

## Acceptance Criteria
- [ ] Timer runs accurately in background tabs without pausing or drifting out of sync.
- [ ] Ambient sound tracks loop seamlessly with smooth fading and individual volume controls.
- [ ] Browser notifications alert students when study/break intervals conclude.
- [ ] Tracked focus time automatically syncs to the user's daily study streak.
