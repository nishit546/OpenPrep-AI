---
title: '[FEAT]: Multimodal Diagram & Math Formula OCR Question Solver with LaTeX Rendering'
labels: 'enhancement, ai, frontend, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Issue Type
New Feature / Multimodal AI / Frontend Math Rendering

## Priority
P1 High

## Summary
Allow students to upload camera photos or screenshots of complex math/science equations and geometry diagrams for automated LaTeX extraction and step-by-step AI solutions.

## Problem Statement
STEM students preparing for competitive exams (JEE, NEET, GATE) encounter complex equations, circuit diagrams, and geometric figures that cannot be easily typed into plain text search bars.

## Current Behavior
Only plain text input is supported for AI question assistance and PYQ searches.

## Expected Behavior
Students can drag-and-drop or snapshot an image of a math/physics problem; Gemini 1.5 Flash multimodal vision extracts the LaTeX math formula and diagrams, providing annotated step-by-step reasoning rendered with KaTeX.

## User Story
As a STEM exam student
I want to snap a photo of a complicated math formula or physics diagram
So that I can get instant KaTeX rendered derivations and step-by-step problem breakdowns

## Proposed Solution
1. Create `frontend/src/components/common/ImageMathUploader.jsx` with client-side image cropping and compression before upload.
2. Extend `backend/src/services/geminiService.js` to process image buffers via multimodal `generativeModel.generateContent([prompt, imagePart])`.
3. Render returned responses in `frontend/src/components/MathSolutionModal.jsx` using `katex` and `react-katex` for crisp mathematical typography.

## Technical Scope

### Frontend Impact
Add KaTeX and react-image-crop dependencies; build image upload modal with live preview.

### Backend Impact
Add multer image buffer streaming and multimodal Gemini vision endpoint `/api/ai/solve-image`.

### Database Impact
Store parsed solution history and image metadata in `UserSolutionHistory` model.

### API Impact
POST `/api/ai/solve-image` handling multipart/form-data.

## Acceptance Criteria
- [ ] Image uploads up to 5MB (PNG/JPEG/WebP) are processed in <4 seconds.
- [ ] Mathematical formulas render cleanly without raw LaTeX string artifacts.
- [ ] Step-by-step solution breaks down formula derivation, key concept, and final answer.

## Testing Requirements

### Unit Tests
- [ ] Test image MIME type validator and KaTeX render error boundary fallback.

### Manual Testing
- [ ] Upload sample JEE calculus and physics circuit problem images to verify rendering.

## Affected Areas
- [x] Frontend
- [x] Backend
- [x] AI
- [x] UI/UX

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 3 (Hard / Advanced) (ECSoC26-L3)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
