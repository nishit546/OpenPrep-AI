---
title: '[FEAT]: Dynamic PDF Watermarking, Digital Signature & Chapter-Wise Export for Custom Study Notes'
labels: 'enhancement, backend, frontend, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Students creating comprehensive revision notes on OpenPrep AI often want to export clean, printable PDF documents for offline studying, binder printing, or sharing with study squad peers. To maintain academic ownership and prevent unauthorized redistribution, documents need customizable watermarks and clean formatting.

This feature adds **Dynamic PDF Watermarking, Custom Headers/Footers, and Chapter-Wise Export** for student study notes.

---

## Technical Scope & Architecture

### Backend Architecture
1. **PDF Generation Service (`backend/services/pdfExportService.js`)**:
   - Utilizes `pdf-lib` / headless Chrome rendering for high-fidelity vector PDF generation from Markdown/HTML.
   - Injects student username, university/exam title, generated date, and customizable diagonal opacity watermarks across pages.
   - Embeds a dynamic QR code on the title page linking back to the live interactive note on OpenPrep AI.
2. **REST Endpoints (`backend/controllers/noteExportController.js`)**:
   - `POST /api/notes/:id/export-pdf` - Generates and streams branded PDF binary with custom layout options (Page Size: A4/Letter, Theme: Light/Dark/Print-Friendly).

### Frontend Architecture
1. **PDF Export Dialog (`frontend/src/components/notes/PdfExportModal.jsx`)**:
   - Live PDF layout preview showing margin sizes, font typography, and watermark preview.
   - Checkbox controls for: "Include Table of Contents", "Include AI Summaries", "Include QR Code Link", "Print-Optimized Black & White".

---

## Acceptance Criteria
- [ ] Users can export any study note or study plan into an A4 PDF within 2 seconds.
- [ ] Exported PDFs render LaTeX math formulas, code snippets, and tables with sharp vector quality.
- [ ] Optional watermark (text, opacity, angle) renders cleanly across all pages without obscuring text.
- [ ] QR code on cover page scans directly to the note URL on OpenPrep AI.
