---
title: '[FEAT]: Adaptive Ambient Soundscape & Binaural Beats Generator for Deep Focus Study Sessions'
labels: 'enhancement, frontend, ui/ux, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Auditory distractions in libraries, dorms, or cafes impair student focus. Neuroscientific research shows that auditory masking using colored noise (Brown/Pink noise) and binaural beats (40Hz Gamma for problem-solving, 10Hz Alpha for relaxed memory consolidation) significantly enhances concentration.

This feature creates a **Client-Side Ambient Soundscape & Binaural Beats Synthesizer** powered by the Web Audio API without needing external streaming bandwidth.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Web Audio Sound Generator Engine (`frontend/src/utils/soundscapeEngine.js`)**:
   - Web Audio API pure synthesizer generating real-time algorithmic audio streams:
     * **Binaural Beats Generator**: Dual oscillator feeding slightly offset frequencies to Left and Right stereo channels (e.g. Left: 200Hz, Right: 240Hz $\rightarrow$ 40Hz Gamma beat).
     * **Colored Noise Synthesizers**: Pink, White, and Brown noise buffer generators with biquad lowpass filtering.
     * **Natural Ambience Loops**: Rain on window, crackling fireplace, coffee shop murmur, and gentle forest wind.
2. **Focus Soundscape Drawer (`frontend/src/components/focus/SoundscapeMixer.jsx`)**:
   - Multi-channel volume slider mixer allowing students to blend rain + brown noise + 40Hz Gamma beats simultaneously.
   - Presets: "Deep Calculus Sprint", "Late Night Memory Retention", "Calm Reading".
   - Seamless integration with the Pomodoro Study Timer.

---

## Acceptance Criteria
- [ ] Synthesizes pure binaural beats and colored noise on the client without buffering or external audio network requests.
- [ ] Multi-channel mixer allows custom volume blending and saves user sound presets to localStorage.
- [ ] Audio fades out smoothly upon timer pause or completion without clicking artifacts.
- [ ] Verified cross-browser compatibility across Chrome, Firefox, Safari, and mobile browsers.
