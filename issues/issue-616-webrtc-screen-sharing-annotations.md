---
title: '[FEAT]: WebRTC Low-Latency Screen Sharing & Real-Time Synchronized Annotations for Study Rooms'
labels: 'enhancement, fullstack, realtime, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
When collaborating in virtual study rooms, students frequently need to present problem solutions, walk through coding exercises, or explain math derivations from their local desktop or tablet. Simple screen sharing without interactive drawing forces passive watching rather than active collaborative learning.

This feature adds **Peer-to-Peer WebRTC Screen Sharing with a Synchronized Vector Annotation Layer** over live video streams in study squad rooms.

---

## Technical Scope & Architecture

### WebRTC & Signaling Architecture
1. **WebRTC Peer Connection (`frontend/src/services/webrtcScreenService.js`)**:
   - `getDisplayMedia()` screen capture with adaptive bitrate (1080p@30fps, 720p fallback).
   - ICE candidate negotiation and STUN/TURN traversal over existing WebSocket gateway.
   - Dual stream support (simultaneous webcam avatar + desktop screen).
2. **Transparent Vector Annotation Canvas (`frontend/src/components/studyrooms/AnnotationOverlay.jsx`)**:
   - Transparent HTML5 Canvas layered above `<video>` screen stream.
   - Synchronizes cursor pointers, laser highlighter trails, and pen vector strokes via binary WebSocket packets with timestamped interpolation.
   - Per-user colored cursor badges with student name tags.
   - Clear canvas, undo/redo stroke stack, and snapshot capture to notes.

---

## Acceptance Criteria
- [ ] Students can initiate screen sharing with system audio capture across modern browsers.
- [ ] Sub-150ms screen video and vector stroke latency in P2P mesh and SFU room topologies.
- [ ] Multi-user concurrent drawing overlays with distinctive user colors and laser pointer trails.
- [ ] One-click button to export the annotated screen frame directly to the user's Cornell Notes.
