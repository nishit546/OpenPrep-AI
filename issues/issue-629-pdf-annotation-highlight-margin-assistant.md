---
title: '[FEAT]: Interactive PDF Document Reader with Highlight Text Extraction & AI Margin Assistant'
labels: 'enhancement, frontend, fullstack, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When reviewing heavy academic textbook chapters and past paper solution manuals in PDF format, students frequently highlight critical definitions, formulas, and diagrams. However, standard PDF viewers store annotations in siloed files, preventing students from aggregating high-yield highlights into active study materials.

This feature creates an **Integrated PDF Reader & Margin Study Assistant** that renders PDFs with multi-color highlighting, extracts highlighted passages into an organized revision outline, and provides an inline AI margin assistant.

---

## Technical Scope & Architecture

### Frontend PDF Reader & Annotation Layer
1. **Interactive PDF Viewer (`frontend/src/components/pdf/PdfStudyReader.jsx`)**:
   - Built on `pdfjs-dist` / `react-pdf` with vector text selection layers and virtualized page rendering.
   - Annotation toolset: Multi-color highlighter (Yellow: Key Concept, Green: Definition, Pink: Formula), freehand pen, and sticky note pins.
   - Stores annotation bounding boxes in normalized coordinates for responsive window resizing.
2. **AI Margin Assistant (`frontend/src/components/pdf/MarginAssistantSidebar.jsx`)**:
   - Selecting any text passage or diagram bounding box triggers a floating quick-action pill:
     - "Explain in Simple Terms"
     - "Create Flashcard from Selection"
     - "Generate Practice MCQ"

### Backend Annotation Sync
1. **Annotation Sync Service (`backend/controllers/pdfAnnotationController.js`)**:
   - `GET /api/documents/:id/annotations` & `PUT /api/documents/:id/annotations`: Synchronizes user annotations and highlighted text snippets.
   - `POST /api/documents/:id/export-highlights`: Exports all highlighted excerpts as a formatted Markdown/Cornell note sheet.

---

## Acceptance Criteria
- [ ] Smooth PDF rendering with responsive zoom, page jumping, and multi-color text highlighting.
- [ ] Text selections seamlessly trigger AI margin actions (Explain, Flashcard, Quiz generation).
- [ ] Automatically compiles all document highlights into an exportable study summary.
- [ ] Preserves exact annotation coordinates across viewport and zoom adjustments.
