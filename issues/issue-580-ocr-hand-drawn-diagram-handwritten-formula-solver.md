---
title: '[FEAT]: Optical Character Recognition (OCR) Hand-Drawn Diagram & Handwritten Formula Solver'
labels: 'enhancement, ai, pyq-analysis, frontend, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Students often take photos of handwritten lecture notes, whiteboard sketches, and printed textbook diagrams with their smartphones. Standard text-only OCR struggles to parse multi-line algebraic fractions, organic chemistry benzene rings, and circuit schematics.

This feature implements a **Multimodal OCR Diagram & Handwritten Math Solver** capable of transcribing handwritten STEM notes directly into formatted LaTeX and editable flashcards.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Image Capture & Cropper Canvas (`frontend/src/components/ocr/DiagramImageCropper.jsx`)**:
   - Drag-and-drop image uploader with camera capture support on mobile.
   - Interactive bounding-box cropper with contrast, brightness, and perspective-correction filters to enhance faint pencil handwriting.
2. **OCR Result Reviewer & LaTeX Editor (`frontend/src/components/ocr/OcrResultViewer.jsx`)**:
   - Split-screen comparison: Original handwritten image on left, extracted LaTeX and rendered KaTeX formula on right.
   - "Add to Flashcards" or "Solve with AI" direct action buttons.

### Backend Architecture
1. **Multimodal OCR Processing Pipeline (`backend/services/multimodalOcrService.js`)**:
   - Image pre-processing via `sharp` (grayscale conversion, adaptive threshold binarization, noise reduction).
   - Google Gemini 1.5 Pro Multimodal Vision API ingestion with specialized prompt engineering for mathematical syntax and scientific diagrams.
2. **REST Endpoints (`backend/controllers/ocrController.js`)**:
   - `POST /api/ocr/parse-diagram` - Ingests multipart image; returns transcribed LaTeX, step-by-step solution, and concept tags.

---

## Acceptance Criteria
- [ ] Accurately transcribes complex handwritten math formulas (integrals, Greek symbols, matrices) into valid LaTeX.
- [ ] Image cropper provides intuitive touch controls for selecting specific regions of a textbook page.
- [ ] Users can convert extracted formula cards directly into flashcard decks with one click.
- [ ] Integration tests verify image resizing, MIME type validation, and error handling for blurry images.
