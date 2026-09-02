---
title: '[FEAT]: Interactive Formula Sheet Builder with MathQuill Live Visual Equation Editor'
labels: 'enhancement, frontend, ui/ux, study-planner, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Formulas in Physics, Mathematics, and Chemistry are challenging to memorize without structured cheat sheets. Typing raw LaTeX is difficult for beginners, while static textbook formulas cannot be customized or reorganized.

This feature creates an **Interactive Formula Sheet Builder with MathQuill Live Visual Equation Editor**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Visual Equation Editor Canvas (`frontend/src/components/formulaBuilder/VisualFormulaEditor.jsx`)**:
   - MathQuill / MathLive interactive equation input bar with real-time bidirectional LaTeX synchronization.
   - Clickable math toolbar categorized by: Arithmetic, Calculus (Derivatives, Integrals, Limits), Linear Algebra (Matrices, Vectors), Chemistry Notation (Subscripts, Reaction Arrows).
2. **Drag-and-Drop Formula Grid (`frontend/src/components/formulaBuilder/FormulaSheetGrid.jsx`)**:
   - Modular card grid where students can organize formulas into customized sections (e.g., "Thermodynamics Formulas", "Trigonometric Identities").
   - Add notes, variable definitions ($v = \text{velocity}$, $m = \text{mass}$), and highlight key exam tricks.
3. **Export Formats**:
   - Export to printable PDF cheat sheet, high-resolution PNG, or raw LaTeX source code.

### Backend Architecture
1. **REST Endpoints**:
   - `POST /api/formula-sheets` - Saves custom formula sheet with title, subject, and serialized formula cards.
   - `GET /api/formula-sheets/:id` - Retrieves formula sheet.

---

## Acceptance Criteria
- [ ] Students can compose complex mathematical and chemical formulas using a visual point-and-click editor.
- [ ] Formula cards can be rearranged with drag-and-drop into multi-column cheat sheets.
- [ ] Formula sheets can be exported to PDF and synchronized across devices.
