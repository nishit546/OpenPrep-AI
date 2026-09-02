---
title: '[FEAT]: Micro-Credential Digital Badge & Certificate Generator with Cryptographic Verification & PDF QR Code'
labels: 'enhancement, dashboard, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students preparing for certifications, competitive exams, or completing intensive 30-day study sprints value tangible credentials they can share on LinkedIn, portfolios, or with academic mentors.

This feature implements a **Micro-Credential Certificate Generator with Cryptographic Hash Signing and Public QR Code Verification**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Certificate Minting & Signing Service (`backend/services/certificateService.js`)**:
   - Mints a unique certificate upon completing milestone criteria (e.g. 100% Subject Syllabus Completion, 30-Day Streak, Scoring $>90\%$ on Full Mock Exam).
   - Signs certificate payload with SHA-256 HMAC cryptographic signature and stores metadata record with public UUID.
   - Generates high-resolution PDF certificate using `pdf-lib` with embedded dynamic QR code linking to verification URL.
2. **Public Verification API (`backend/controllers/certificateVerificationController.js`)**:
   - `GET /api/certificates/verify/:certId` - Public endpoint returning verified recipient name, issue date, credential title, and authenticity status.

### Frontend Architecture
1. **Certificate Showcase Modal (`frontend/src/components/credentials/CertificateModal.jsx`)**:
   - Elegant framed certificate preview with metallic badge foil gradients.
   - "Download PDF", "Share on LinkedIn", and "Copy Verification Link" buttons.
2. **Public Verification Page (`frontend/src/pages/PublicVerifyCertificate.jsx`)**:
   - SEO-friendly public landing page displaying cryptographic authenticity checkmark, issuer verification, and student achievement summary.

---

## Acceptance Criteria
- [ ] Mints tamper-proof digital certificates with verifiable cryptographic SHA-256 signatures.
- [ ] Generates clean, print-ready PDF certificates with embedded QR codes.
- [ ] Public verification URL correctly confirms certificate validity without requiring user login.
- [ ] Automated tests cover signature verification and PDF generation performance.
