---
title: '[FEAT]: Real-Time Whiteboard with Freehand Vector Canvas, Math Shape Recognition & Multi-Cursor Sync'
labels: 'enhancement, frontend, backend, ui/ux, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
When studying complex subjects like Physics, Geometry, Organic Chemistry, or Circuit Design in study squads, text chat alone is insufficient. Students need a shared, zero-latency visual whiteboard where they can draw diagrams, sketch equations, and collaborate synchronously.

This feature adds a **Real-Time Collaborative Vector Whiteboard** powered by HTML5 Canvas / Fabric.js / tldraw, complete with AI math shape recognition and multi-cursor presence synchronization.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Whiteboard Canvas Workspace (`frontend/src/components/whiteboard/WhiteboardCanvas.jsx`)**:
   - Infinite pan and zoom canvas with pressure-sensitive freehand drawing, straight lines, geometric shapes, and KaTeX text blocks.
   - Real-time peer cursors with participant name badges and distinct color trails.
   - Undo/Redo historical stack synchronized across clients.
2. **AI Shape & Equation Recognizer (`frontend/src/components/whiteboard/ShapeMagicTool.jsx`)**:
   - "Magic Pen" mode: rough hand-drawn circles, ellipses, triangles, and coordinate axes automatically snap into pristine vector shapes.
   - Handwriting OCR: converts sketched math equations directly into editable KaTeX formulas.

### Backend Architecture
1. **WebSocket Vector Delta Synchronization (`backend/services/whiteboardSocketService.js`)**:
   - Operational Transformation / Yjs CRDT room provider broadcasting canvas element mutations (add, transform, delete, z-index).
   - Redis adapter for pub/sub event fan-out across horizontally scaled backend instances.
2. **Canvas State Persistence (`backend/controllers/whiteboardController.js`)**:
   - `POST /api/whiteboard/:roomId/snapshot` - Saves serialized vector JSON and generates PNG preview thumbnails.
   - `GET /api/whiteboard/:roomId/state` - Retrieves full canvas state upon user joining an ongoing study session.

---

## Acceptance Criteria
- [ ] Sub-50ms latency for drawing strokes and cursor synchronization across multiple squad members.
- [ ] Hand-drawn polygons and circles snap reliably to clean geometry when Magic Pen is active.
- [ ] Board state persists automatically to the database and reloads seamlessly upon page refresh.
- [ ] E2E Playwright test validating multi-user concurrent drawing without state desynchronization.
