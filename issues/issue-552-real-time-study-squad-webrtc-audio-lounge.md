---
title: '[FEAT]: Real-Time Study Squad Live Screen & Audio Lounge with WebRTC Mesh'
labels: 'enhancement, frontend, backend, community, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Study squad members often want to study "together in silence" or share their screens while solving challenging math problems. Relying on external meeting links (Zoom/Meet) breaks the study flow.

This feature embeds a **Lightweight WebRTC Audio Lounge & Screen Sharing Space** directly inside OpenPrep Study Squads.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **WebRTC Voice & Screen Client (`frontend/src/components/squads/SquadAudioLounge.jsx`)**:
   - Full WebRTC peer connection mesh handling peer signaling, ICE candidates, and audio stream tracks.
   - Controls for Mic Mute, Deafen, Push-to-Talk, Screen Share, and Audio Volume sliders per participant.
   - Visual audio waveform indicators showing who is currently speaking.
2. **Focus Mode Minimalist Pip (Picture-in-Picture)**:
   - Floating widget allowing students to browse flashcards or quizzes while keeping squad audio active.

### Backend Architecture
1. **Signaling Server (`backend/services/webrtcSignalingService.js`)**:
   - Socket.io signaling layer managing room joins, offers, answers, and ICE candidate exchange.
2. **Room Capacity & State Management**:
   - Limits peer mesh to 8 active voice participants per room to maintain low CPU and bandwidth overhead.

---

## Acceptance Criteria
- [ ] Squad members can enter voice lounge with clear peer-to-peer audio and mute/deafen toggles.
- [ ] Screen sharing allows presenting solutions with sub-second latency across squad members.
- [ ] Seamlessly switches audio device inputs and displays active speaking rings around avatars.
