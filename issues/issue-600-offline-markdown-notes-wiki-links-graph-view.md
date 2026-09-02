---
title: '[FEAT]: Offline-First Note-Taking System with Markdown, KaTeX, Bidirectional Wiki-Links & Graph View'
labels: 'enhancement, frontend, ui/ux, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Students retain information better when they can create interconnected knowledge webs linking concepts across different subjects (e.g. linking `[[Thermodynamics]]` in Physics to `[[Enthalpy]]` in Chemistry). Linear notes fail to capture these relationships.

This feature implements an **Obsidian-Style Offline-First Markdown Note-Taking Workspace** with bidirectional wiki-links (`[[Topic Name]]`), KaTeX math rendering, and an interactive 2D/3D Force-Directed Knowledge Graph.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Markdown Editor with Live Math (`frontend/src/components/notes/MarkdownNotesEditor.jsx`)**:
   - Milkdown / TipTap markdown editor with inline LaTeX preview (`$...$` and `$$...$$`), code block syntax highlighting, and checklist task items.
   - Autocomplete trigger for bidirectional wiki-links: typing `[[` searches existing notes and subjects in real time.
2. **Interactive 2D/3D Knowledge Graph Visualizer (`frontend/src/components/notes/KnowledgeGraphView.jsx`)**:
   - Force-directed graph (using `force-graph` / `3d-force-graph`) displaying interconnected study notes as nodes and wiki-links as edges.
   - Node size scaled by backlink count; color-coded by Subject/Exam category with search and cluster filtering.
3. **Local-First IndexedDB Sync (`frontend/src/utils/notesOfflineStorage.js`)**:
   - Automatic local saving with background sync when internet connection is restored.

### Backend Architecture
1. **Bidirectional Link Indexer & Graph Resolver (`backend/services/noteGraphService.js`)**:
   - Parses markdown AST to extract wiki-link references and maintains a bidirectional link adjacency table in PostgreSQL.
2. **REST Endpoints (`backend/controllers/notesController.js`)**:
   - `GET /api/notes/graph` - Returns serialized nodes and edges for the user's entire knowledge base.
   - `POST /api/notes/sync` - Batch synchronizes local offline notes with server database.

---

## Acceptance Criteria
- [ ] Typing `[[Topic]]` dynamically links related notes and populates bidirectional backlink lists.
- [ ] Interactive Knowledge Graph visualizes note connections with smooth physics simulation and node clicking.
- [ ] Notes save instantly to IndexedDB and function seamlessly with zero network connectivity.
- [ ] Automated tests verify markdown AST wiki-link extraction and graph adjacency serialization.
