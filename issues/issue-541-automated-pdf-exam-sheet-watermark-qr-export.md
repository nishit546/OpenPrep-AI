---
title: '[FEAT]: Automated PDF Exam Sheet Watermarking, Digital Rights & PDF Export Layout Optimizer'
labels: 'enhancement, backend, study-planner, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Educators and students frequently generate PDF question sheets and revision summaries for offline printouts. Without proper formatting, printouts suffer from awkward page breaks, overflowing equations, and lack of attribution/security watermarks.

This feature implements an **Automated PDF Exam Sheet Watermarking, Digital Rights & Print Layout Optimizer**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **PDF Generation & Formatting Pipeline (`backend/services/pdfExportService.js`)**:
   - Utilizes `pdfkit` / `puppeteer-core` with print stylesheet CSS optimizations (`@media print`, `page-break-inside: avoid`).
   - Renders LaTeX equations cleanly into vector PDF curves.
2. **Dynamic Watermarking & QR Verification (`backend/services/watermarkService.js`)**:
   - Generates subtle diagonal semi-transparent watermarks containing student name, organization/institution, and export timestamp.
   - Embeds a dynamic QR code on the footer of every page linking directly to the live digital solution and interactive quiz on OpenPrep AI.
3. **REST Endpoints**:
   - `POST /api/export/exam-pdf` - Ingests quiz ID / revision note ID with customizable layout parameters (Font size, 2-column compact layout, watermark text).

### Frontend Architecture
1. **Print Preview & Export Modal (`frontend/src/components/export/PdfExportModal.jsx`)**:
   - Interactive preview showing exact page layout, toggle for Answer Key inclusion, watermark preferences, and QR code placement.

---

## Acceptance Criteria
- [ ] Generates clean, publication-quality 1-column or 2-column PDF sheets without broken question layouts.
- [ ] Embedded QR codes link directly to corresponding OpenPrep online quiz/answers.
- [ ] Watermark text and branding render crisp and semi-transparent across all PDF pages.
