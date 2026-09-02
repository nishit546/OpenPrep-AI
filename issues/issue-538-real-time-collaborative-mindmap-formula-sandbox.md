---
title: '[FEAT]: Real-Time Multi-User Collaborative Mindmap & Formula Sandbox for Study Squads'
labels: 'enhancement, frontend, ui/ux, community, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Study squads need interactive visual spaces to co-create revision mindmaps, link interdisciplinary concepts, and construct shared formula cheat-sheets in real time during group study sessions.

This feature builds a **Real-Time Collaborative Mindmap & Formula Sandbox Engine** integrated into Study Squad rooms.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Dynamic Node Tree Canvas (`frontend/src/components/mindmap/CollaborativeMindmap.jsx`)**:
   - SVG/HTML5 canvas with interactive force-directed or tree-layout nodes.
   - Node styling: Custom colors, icons, LaTeX equation rendering (KaTeX), markdown formatted notes, and thumbnail links.
   - Multi-cursor presence showing each squad member's avatar and selection state.
2. **Formula Sandbox & Quick LaTeX Pallet (`frontend/src/components/mindmap/FormulaPaletteModal.jsx`)**:
   - Visual formula builder with clickable math symbols (integrals, fractions, matrices, Greek symbols) that automatically inserts KaTeX blocks into mindmap nodes.
3. **One-Click Flashcard Deck Generator**:
   - Button to convert any node branch into a structured OpenPrep flashcard deck.

### Backend Architecture
1. **WebSocket Mindmap Sync Service (`backend/services/mindmapSocketService.js`)**:
   - Broadcasts node additions, moves, edits, and connector links with debounced snapshot persistence.
2. **REST Endpoints**:
   - `GET /api/squads/:squadId/mindmaps` - Retrieves saved mindmap canvas states.
   - `POST /api/squads/:squadId/mindmaps` - Creates a new squad mindmap.
   - `PUT /api/mindmaps/:id` - Updates serialized node tree state.

---

## Acceptance Criteria
- [ ] Multiple users in a squad can edit nodes, add branches, and link topics simultaneously.
- [ ] KaTeX formulas render sharply within mindmap nodes and update in real time across clients.
- [ ] Squad mindmap can be exported to PNG, SVG, PDF, or converted to a flashcard deck.
