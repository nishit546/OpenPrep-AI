---
title: '[FEAT]: Automated End-to-End Visual Regression Testing Suite Using Playwright & Percy/Pixelmatch'
labels: 'enhancement, devops, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As new UI components, dark theme tweaks, and responsive layouts are contributed across different pull requests, unintended CSS regressions (broken margins, overlapping text, color contrast glitches) can slip into production without automated visual comparison.

This feature establishes an **Automated Visual Regression Testing Pipeline in CI/CD using Playwright and Pixelmatch**.

---

## Technical Scope & Architecture

### Test Automation Architecture
1. **Visual Snapshot Test Suite (`tests/visual/visual-regression.spec.js`)**:
   - Captures baseline screenshots across key viewports (Mobile: 375x812, Tablet: 768x1024, Desktop: 1440x900).
   - Test targets:
     - Dashboard Analytics & Heatmap widgets.
     - Quiz Runner & Question Palette in Light & Dark modes.
     - Flashcard 3D flip card animations.
     - Study Squad Whiteboard canvas.
2. **Pixel-by-Pixel Diff Comparison Engine**:
   - Compares pull request visual captures against golden baseline snapshots with a configurable threshold tolerance ($<0.2%$ mismatch).
   - Generates visual side-by-side diff artifacts highlighting altered pixels in magenta.
3. **GitHub Actions Workflow (`.github/workflows/visual-regression.yml`)**:
   - Runs automatically on pull requests targeting `main`; uploads visual diff report artifacts when mismatches occur.

---

## Acceptance Criteria
- [ ] Playwright visual test suite covers primary views across desktop and mobile viewports.
- [ ] Generates clear visual diff artifacts whenever unintended styling changes occur.
- [ ] Workflow runs deterministically in headless CI with consistent font rendering.
- [ ] Developer guide in `docs/visual-testing.md` explaining how to update baseline snapshots.
