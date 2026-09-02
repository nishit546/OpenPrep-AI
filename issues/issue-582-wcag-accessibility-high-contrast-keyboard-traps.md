---
title: '[FEAT]: WCAG 2.1 AAA Accessibility Overhaul: High-Contrast Theme, Keyboard Traps & Screen Reader Live Regions'
labels: 'enhancement, accessibility, ui/ux, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Education must be accessible to all students, including those with visual impairments, motor disabilities, or situational constraints. All student-facing flows in OpenPrep AI should meet WCAG 2.1 Level AAA standards.

This feature performs a comprehensive **Accessibility (a11y) Overhaul with High-Contrast Themes, Full Keyboard Navigation, and Screen Reader Optimization**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Focus Trap & Keyboard Navigation (`frontend/src/hooks/useFocusTrap.js`)**:
   - Ensures all modals, dropdowns, and quiz dialogs trap focus correctly and release upon pressing `Escape`.
   - Full keyboard shortcuts across platform: `Alt + Q` (Next Question), `Alt + F` (Flip Flashcard), `Space` (Mark Known), `/` (Global Search).
   - Visible high-contrast focus rings (`:focus-visible`) with customized outline offsets.
2. **Screen Reader ARIA Live Regions (`frontend/src/components/common/AriaAnnouncer.jsx`)**:
   - `aria-live="polite"` announcements for dynamic countdown timer ticks, quiz score updates, and live squad notifications.
   - Proper `aria-expanded`, `aria-controls`, and `aria-describedby` attributes on all interactive elements.
3. **High-Contrast & OLED Black Theme**:
   - 7:1 minimum contrast ratio across all text and icons compliant with WCAG AAA.

---

## Acceptance Criteria
- [ ] 100% of platform flows (Registration, Quiz Runner, Flashcards, Study Planner) are fully navigable via keyboard alone.
- [ ] Screen readers (NVDA, VoiceOver, JAWS) announce dynamic updates clearly without duplicate chatter.
- [ ] Zero critical or serious accessibility violations reported by automated `axe-core` test runs.
- [ ] High-contrast mode toggle available in user accessibility settings.
