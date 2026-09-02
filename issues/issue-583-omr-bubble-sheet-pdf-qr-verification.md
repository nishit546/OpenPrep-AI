---
title: '[FEAT]: Automated PDF Exam Answer Sheet Generator with OMR Bubble Sheet & QR Code Verification'
labels: 'enhancement, backend, quiz-system, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Many major competitive examinations (UPSC, SAT, NEET, GRE) are administered on physical Optical Mark Recognition (OMR) bubble sheets. Students preparing digitally often struggle with physical time-management and bubbling accuracy on real exam day.

This feature implements an **Automated OMR Bubble Sheet PDF Generator with Question QR Code Integration**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **OMR Sheet Layout Generator (`backend/services/omrPdfService.js`)**:
   - Generates standardized printable A4 PDF bubble sheets corresponding to any generated quiz.
   - Grid layout of numbered bubbles (A, B, C, D) with alignment corner marks for future scanner evaluation.
   - Injects student ID, exam code, and dynamic verification QR code containing encrypted quiz metadata.
2. **REST Endpoints (`backend/controllers/omrController.js`)**:
   - `GET /api/quizzes/:id/omr-sheet.pdf` - Generates and streams printable OMR bubble sheet.
   - `GET /api/quizzes/:id/answer-key.pdf` - Generates printable examiner answer key with colored correct bubble markers and detailed solutions.

### Frontend Architecture
1. **Quiz Print & OMR Modal (`frontend/src/components/quiz/OmrPrintModal.jsx`)**:
   - Allows students to select "Print Offline Exam Package" (Question Booklet + OMR Bubble Sheet + Answer Key).

---

## Acceptance Criteria
- [ ] Generates crisp, perfectly aligned A4 OMR bubble sheets suitable for home/office printing.
- [ ] Number of bubble rows matches the exact question count of the generated quiz.
- [ ] QR code on the header scans instantly and links directly to the digital quiz on OpenPrep AI.
- [ ] Unit tests for PDF layout coordinate precision and bounding box alignments.
