---
title: '[FEAT]: Real-Time AI Math Equation Step-by-Step Solver with Interactive Graphing & Scratchpad'
labels: 'enhancement, ai, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students preparing for STEM exams (Calculus, Linear Algebra, Physics) frequently get stuck on complex algebraic equations and differential calculus problems. Static solution keys often skip intermediate algebraic transformations, leaving students confused about how a solution was derived.

This feature implements a **Real-Time AI Math Equation Step-by-Step Solver** with interactive 2D function curve plotting, KaTeX equation rendering, and an interactive digital scratchpad for manual derivation verification.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Math Input & Scratchpad (`frontend/src/components/math/MathScratchpad.jsx`)**:
   - MathQuill / KaTeX live math expression editor supporting Greek symbols, integrals, limits, matrices, and fractions.
   - Digital stylus/mouse freehand drawing canvas overlaid on top of LaTeX steps for quick rough work.
2. **Dynamic 2D Function Plotter (`frontend/src/components/math/FunctionPlotter.jsx`)**:
   - Function-plot / Plotly.js integration for real-time visualization of algebraic functions, tangents, derivatives, and roots.
   - Interactive slider controls for variables (e.g. varying parameters $a, b, c$ in $f(x) = ax^2 + bx + c$).
3. **Step-by-Step Breakdown Accordion (`frontend/src/components/math/SolutionStepsAccordion.jsx`)**:
   - Collapsible sub-steps with "Why this step?" AI hints explaining underlying theorems (e.g., L'Hôpital's Rule, Integration by Parts).

### Backend Architecture
1. **AI Mathematical Reasoning Pipeline (`backend/services/mathSolverService.js`)**:
   - Structured prompt chaining with Google Gemini 1.5 Flash / Pro to generate verifiable step-by-step LaTeX derivations and JSON-encoded plot coordinates.
   - Validation filter ensuring intermediate equations preserve mathematical equality.
2. **REST Endpoints (`backend/controllers/mathSolverController.js`)**:
   - `POST /api/math/solve` - Submits a raw LaTeX math equation or problem statement; returns structured steps, formulas, and plot functions.
   - `POST /api/math/verify-step` - Evaluates a student's intermediate attempt against the canonical solution step.

---

## Acceptance Criteria
- [ ] Users can type or paste complex LaTeX mathematical expressions and receive structured step-by-step breakdowns within 3 seconds.
- [ ] Graphs are plotted smoothly with pan, zoom, and root/intercept markers.
- [ ] Students can click "Verify My Step" to check if their intermediate working is algebraically correct.
- [ ] Unit and integration tests verify equation parsing and prompt schema validation.
