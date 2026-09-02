---
title: '[FEAT]: Automated OMR Bubble Sheet Optical Scanner & Instant Grading Engine with OpenCV & Image Processing'
labels: 'enhancement, backend, ai, medium-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Competitive exams (e.g. JEE, NEET, UPSC, SAT) extensively use Optical Mark Recognition (OMR) sheets. Students practicing with printed physical mock papers currently grade 100–180 questions by hand with a red pen, which is slow, error-prone, and loses granular telemetry on question timing and guessing patterns.

This feature creates an **Automated OMR Sheet Optical Scanner** where students snap a photo of their filled OMR sheet with their smartphone or webcam and receive an instant, itemized score breakdown with subject-wise analytics.

---

## Technical Scope & Architecture

### Image Processing & Computer Vision Pipeline
1. **OMR Processing Worker (`backend/services/omrProcessorService.js`)**:
   - **Corner Alignment & Homography**: Locates 4 corner fiducial markers (black squares) on the OMR sheet to correct rotational skew and perspective distortion using OpenCV / Jimp.
   - **Adaptive Thresholding & Grid Segmentation**: Binarizes the image and segments the bubble grid into question blocks (e.g. 4 or 5 options: A, B, C, D, E).
   - **Fill Percentage Detector**: Computes pixel fill density in each circular region of interest (ROI); classifies bubbles with $>60\%$ fill as selected, flags ambiguous/multiple marks.
2. **OMR Evaluation Controller (`backend/controllers/omrController.js`)**:
   - `POST /api/omr/upload-and-grade`: Accepts image upload + exam answer key schema ID; returns marked question sheet overlay, total score, negative marking penalty, and subject breakdown.
   - Generates visual annotated debug image showing recognized selections (green circle for correct, red circle for incorrect).

---

## Acceptance Criteria
- [ ] Correctly rectifies smartphone photos with up to $25^\circ$ angular tilt and uneven lighting.
- [ ] Accurately grades 100-question and 180-question standard OMR sheets with $>99\%$ recognition accuracy on clear marks.
- [ ] Detects multiple shaded bubbles and applies exam-specific negative marking rules.
- [ ] Returns detailed visual overlay highlighting student answers vs official answer key.
