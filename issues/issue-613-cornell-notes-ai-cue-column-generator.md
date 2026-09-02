---
title: '[FEAT]: Interactive Cornell Note-Taking System with AI-Generated Cue Columns & Review Summaries'
labels: 'enhancement, frontend, fullstack, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
The Cornell Note-Taking method divides the page into three distinct sections: the Main Notes area, the Cue/Keywords column on the left, and the Summary block at the bottom. While proven to increase retention, manual formulation of cues and synthesizing concise summaries after intense lectures is time-consuming.

This feature introduces a dedicated **Interactive Cornell Note Editor** with real-time AI cue extraction, automatic summary synthesis, and an **Active Recall Mode** that hides the main notes while prompting students with the cue questions.

---

## Technical Scope & Architecture

### Frontend Architecture & Interactive Editor
1. **Cornell Layout Canvas (`frontend/src/components/notes/CornellEditor.jsx`)**:
   - Resizable 3-panel split layout using CSS Grid with draggable divider handles.
   - **Left Pane (Cue Column)**: Quick bullet points, high-yield vocabulary, and AI-generated probing questions.
   - **Right Pane (Main Notes)**: Rich text editor supporting Markdown, KaTeX mathematical formulas, syntax-highlighted code blocks, and embedded diagrams.
   - **Bottom Pane (Summary)**: 2–3 sentence crystallized takeaway.
2. **Active Recall Testing Mode (`frontend/src/components/notes/CornellRecallMode.jsx`)**:
   - Blurs or folds the Main Notes column with an interactive reveal toggle.
   - Presents cues as interactive flashcards with confidence ratings (Easy, Hard, Review Again).

### Backend AI Engine
1. **Cornell Note Synthesis Service (`backend/services/cornellAiService.js`)**:
   - `POST /api/notes/cornell/generate-cues`: Parses raw lecture notes and extracts 4–8 targeted probing questions and key vocabulary.
   - `POST /api/notes/cornell/generate-summary`: Generates a synthesized 3-sentence summary highlighting the core theorems and practical applications.

---

## Acceptance Criteria
- [ ] Responsive Cornell 3-section layout with synchronized scrolling and draggable dividers.
- [ ] Real-time KaTeX math and Markdown rendering in main notes and cue column.
- [ ] One-click AI generation of cue questions and bottom summary from main notes text.
- [ ] Active Recall Mode successfully masks main notes and facilitates self-quizzing on cues.
- [ ] Export notes to formatted PDF and Markdown following classic Cornell visual guidelines.
