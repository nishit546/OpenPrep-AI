---
title: '[FEAT]: AI Factuality & Citation Verification Engine for Generated Flashcards & Explanations'
labels: 'enhancement, ai, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Generative AI models can occasionally produce subtle hallucinations in specialized scientific formulas, historical dates, or legal definitions. For students preparing for rigorous competitive exams, learning a flawed formula or incorrect constant can be disastrous.

This feature establishes an **AI Factuality Verification & Source Citation Layer** that validates AI-generated flashcards, quiz explanations, and summaries against curated syllabus reference corpora before presenting them to students.

---

## Technical Scope & Architecture

### Backend Pipeline & Verification Flow
1. **Self-Correction & Dual-Pass Factuality Checker (`backend/services/factualityVerifier.js`)**:
   - Secondary verification pass using a high-precision prompt with Gemini 1.5 Pro:
     - Extracts all entity claims, numerical constants, chemical equations, and theorem names.
     - Cross-references claims against pre-indexed authoritative syllabus embeddings (NCERT, OpenStax, standard textbooks).
     - Returns a `confidenceScore` ($0.0–1.0$) and `factualIssuesFound` list with exact token spans.
2. **Citation Annotation Service (`backend/services/citationService.js`)**:
   - Attaches clickable footnote citations `[^1]` linking generated assertions to standard curriculum chapters and standard unit definitions.
3. **Admin Flagging & Review Queue (`backend/controllers/factualityController.js`)**:
   - Automatically quarantines any AI-generated explanation with a confidence score $< 0.85$ for educator review.
   - Endpoint `GET /api/admin/flagged-explanations` and `PUT /api/admin/verify-explanation/:id`.

---

## Acceptance Criteria
- [ ] Automatically detects and corrects inaccurate scientific constants, mathematical equations, and historical facts.
- [ ] Inserts verified source citations into quiz answer explanations and flashcard definitions.
- [ ] Automatically quarantines low-confidence ($< 0.85$) generated materials into an educator moderation queue.
- [ ] Evaluates verification pass within $< 600\text{ms}$ additional latency overhead.
