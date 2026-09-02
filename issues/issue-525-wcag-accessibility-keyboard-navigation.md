---
title: '[A11Y]: Comprehensive WCAG 2.1 AA Compliance with ARIA Landmarks and Keyboard Shortcuts'
labels: 'enhancement, accessibility, ui/ux, frontend, good first issue, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Issue Type
Accessibility / UI/UX / Inclusive Design

## Priority
P3 Low

## Summary
Audit and implement WCAG 2.1 AA compliance across all components, including proper ARIA landmarks, visible focus rings, high-contrast color ratios, and global keyboard shortcuts.

## Problem Statement
Keyboard-only and screen reader users face navigation hurdles due to missing `aria-label` attributes on icon buttons, poor tab order on quiz modals, and insufficient contrast ratios on subtle secondary text.

## Current Behavior
Interactive icon buttons lack descriptive ARIA labels, focus states are stripped via `outline: none`, and modal popups do not trap keyboard focus properly.

## Expected Behavior
All interactive elements are 100% accessible via keyboard navigation (Tab/Shift+Tab/Enter/Space), screen readers announce dynamic quiz score changes via `aria-live="polite"`, and modals trap focus with Esc to close.

## User Story
As a visually impaired or keyboard-first learner
I want seamless screen reader compatibility and keyboard navigation
So that I can study, take quizzes, and flip flashcards without needing a mouse

## Proposed Solution
1. Add descriptive `aria-label`, `role`, and `aria-expanded` attributes to all icon buttons and dropdown menus in `frontend/src/components/`.
2. Implement `react-focus-lock` inside all dialog modals and study drawers.
3. Add global keyboard shortcuts: `Space` to flip flashcard, `1`-`4` for MCQ options, `J`/`K` for navigation, `?` to show shortcuts cheat sheet modal.

## Technical Scope

### Frontend Impact
Update Tailwind/CSS focus ring utilities, add `KeyboardShortcutsModal.jsx`, and configure `axe-core` in development mode.

### Backend Impact
None.

### Database Impact
None.

### API Impact
None.

## Acceptance Criteria
- [ ] Lighthouse accessibility score achieves 100/100 on Dashboard, Quiz, and Flashcard pages.
- [ ] All modals trap focus and allow closing with the `Escape` key.
- [ ] Global keyboard shortcuts modal triggers on pressing `?` key.

## Testing Requirements

### Unit Tests
- [ ] Automated `@axe-core/react` accessibility lint tests.

### Manual Testing
- [ ] Full keyboard navigation run-through using NVDA/VoiceOver screen reader.

## Affected Areas
- [x] Frontend
- [x] UI/UX
- [x] Accessibility

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
