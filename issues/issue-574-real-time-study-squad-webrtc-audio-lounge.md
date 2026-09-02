---
title: '[FEAT]: Real-Time Study Squad Live Audio Lounge with WebRTC Mesh & Active Speaker Highlight'
labels: 'enhancement, frontend, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Study Squads thrive on interactive peer accountability and study-with-me co-working sessions. Switching between OpenPrep AI and third-party voice apps (Discord, Google Meet) causes tab clutter and distracts students.

This feature builds a **Native Low-Latency Audio Lounge** embedded directly inside Study Squad rooms using WebRTC mesh networking and WebSocket signaling.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Audio Lounge Control Bar & Dock (`frontend/src/components/squads/AudioLounge.jsx`)**:
   - Persistent bottom floating bar with Mute/Unmute microphone, Deafen, Push-to-Talk, and Audio Device Selector (Input/Output).
   - Audio visualizer with animated pulsing glowing avatar ring indicating when a squad member is speaking.
2. **WebRTC Client Connection Manager (`frontend/src/services/webrtcClient.js`)**:
   - Peer connection mesh management using `RTCPeerConnection`.
   - Audio track gain nodes and Web Audio API `AnalyserNode` for local voice activity detection (VAD).

### Backend Architecture
1. **WebRTC Signaling Gateway (`backend/services/audioSignalingSocket.js`)**:
   - Handles SDP offer/answer exchanges, ICE candidate relays, and room participant roster events over WebSockets.
   - Room occupancy management (up to 8 concurrent peers per audio lounge).
2. **REST Endpoints**:
   - `GET /api/squads/:id/audio-status` - Returns active participants in the audio lounge.

---

## Acceptance Criteria
- [ ] Squad members can join the Audio Lounge and communicate with crystal-clear, low-latency (<150ms) audio.
- [ ] Glowing ring visualizer illuminates around active speakers in real-time.
- [ ] Mute and deafen toggles work instantaneously.
- [ ] Clean peer cleanup when users disconnect or close the tab.
