---
title: '[FEAT]: Bi-Directional AI Mind Map Visualizer & Dynamic Quiz Card Synthesis Engine'
labels: 'enhancement, frontend, ai, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Visual learners benefit tremendously from hierarchical mind maps, while retention relies on active recall flashcards. Currently, these two study modalities exist in silos, forcing students to manually convert mind map diagrams into question decks.

This feature establishes a **Bi-Directional AI Mind Map & Flashcard Synthesis Engine**: students can click any node in an interactive mind map to generate targeted quiz questions, or convert existing flashcard decks into a zoomable, hierarchical concept mind map with export to SVG and JSON.

---

## Technical Scope & Architecture

### Frontend Mind Map Visualizer
1. **Interactive D3 Node Graph (`frontend/src/components/mindmap/MindMapCanvas.jsx`)**:
   - D3.js force-directed / radial tree hierarchical layout with smooth collapsible branch animations.
   - Node styling based on taxonomy depth (Central Subject -> Main Chapters -> Subtopics -> Key Theorems).
   - Contextual node action menu: "Generate Quiz on Topic", "Add Flashcards", "Ask Socratic Tutor".
2. **Export & Import Engine (`frontend/src/utils/mindmapExport.js`)**:
   - High-resolution SVG, PNG, and FreeMind/OPML JSON file format export and import.

### Backend AI Transformation Pipeline
1. **MindMap to Flashcards Generator (`backend/services/mindmapAiService.js`)**:
   - `POST /api/mindmap/to-flashcards`: Parses node hierarchy relationships and outputs cloze and MCQ flashcards.
   - `POST /api/flashcards/to-mindmap`: Analyzes a deck of flashcards and categorizes terms into an interconnected hierarchical JSON tree structure.

---

## Acceptance Criteria
- [ ] Renders interactive, collapsible mind maps with fluid drag, pan, and zoom interactions.
- [ ] One-click action converts any sub-branch or full mind map into an active recall flashcard deck.
- [ ] Successfully synthesizes unstructured flashcard decks into a coherent multi-level concept tree.
- [ ] Exports crystal-clear vector SVGs and standard OPML/JSON mind map formats.
