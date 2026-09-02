---
title: '[FEAT]: Smart PDF Splitter & Automated Chapter/Section Bookmark Extractor for Heavy Textbooks'
labels: 'enhancement, pyq-analysis, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students regularly upload 500+ page textbook PDFs or multi-year PYQ compendiums (100MB+). Processing entire massive files in a single AI context window exceeds token limits and causes timeouts.

This feature implements a **Smart PDF Splitter & Bookmark Extractor** that parses Table of Contents (TOC) structures, splits textbooks into bite-sized chapter modules, and indexes them against the subject syllabus.

---

## Technical Scope & Architecture

### Backend Architecture
1. **PDF Structure & Outline Parser (`backend/services/pdfStructureService.js`)**:
   - Uses `pdf-lib` and `pdfjs-dist` to extract document outline / bookmarks tree with target page numbers.
   - Fallback OCR/heuristic regex pattern matcher scanning introductory pages for Table of Contents patterns (e.g. `Chapter 4: Thermodynamics ... Page 142`).
2. **Chunking & Page Range Splitter (`backend/services/pdfSplitterService.js`)**:
   - Slices large PDF files into distinct chapter sub-documents with preserved vector text and embedded figures.
   - Computes page-level word count, density of formulas, and image presence.
3. **REST Endpoints (`backend/controllers/pdfParserController.js`)**:
   - `POST /api/pdf/inspect-toc` - Uploads PDF and returns extracted chapters and hierarchy tree for user review.
   - `POST /api/pdf/split-chapters` - Triggers background job to split selected chapters and generate topic-linked study modules.

### Frontend Architecture
1. **TOC Visual Chapter Selector (`frontend/src/components/pdf/ChapterSplitSelector.jsx`)**:
   - Tree-view displaying detected chapters with page range sliders, chapter titles, and size estimates.
   - Checkbox selector enabling users to import only required chapters (e.g. "Only Chapter 3 & 7") into their active Study Plan.

---

## Acceptance Criteria
- [ ] Accurately extracts embedded PDF bookmarks and page ranges from standard textbook files.
- [ ] Successfully splits 300+ page PDF into chapter files within 5 seconds without memory spikes.
- [ ] Users can visually select and import specific chapters directly into their syllabus progress tracker.
- [ ] Unit tests cover various TOC hierarchy formats and edge-case malformed outlines.
