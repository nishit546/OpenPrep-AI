---
title: '[FEAT]: High-Performance Virtualized Question Grid & Infinite Scroll for 10,000+ PYQ Question Bank'
labels: 'enhancement, pyq-analysis, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
The previous years' question (PYQ) bank contains tens of thousands of questions with math formulas, diagrams, and options. Standard DOM rendering of hundreds of cards simultaneously results in sluggish UI lag, memory consumption exceeding 500MB, and janky scrolling on mobile devices.

This feature implements **DOM Virtualization and Infinite Windowing** (via TanStack Virtual / react-window) delivering silky 60fps scrolling across 10,000+ question repositories.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Virtualized Question Feed (`frontend/src/components/pyq/VirtualizedQuestionFeed.jsx`)**:
   - TanStack Virtual (`useVirtualizer`) windowing engine rendering only items visible in the current viewport $+ 5$ buffer items.
   - Dynamic item height measurement handling variable-length question stems, diagrams, and KaTeX equations without layout shift.
2. **Multi-Faceted Instant Filter Bar (`frontend/src/components/pyq/PYQFilterToolbar.jsx`)**:
   - Multi-criteria filtering (Year range, Subject, Topic, Question Type: MCQ/Numerical, Difficulty, Status: Solved/Unsolved).
   - Debounced instant search query input with URL search params synchronization.
3. **Skeleton Loading & Prefetching**:
   - Smooth skeleton placeholders and intersection-observer prefetching of subsequent paginated cursor batches.

---

## Acceptance Criteria
- [ ] Renders and scrolls smoothly at 60fps across a simulated dataset of 10,000+ question items.
- [ ] Dynamic element height correctly adjusts when KaTeX equations or diagrams finish rendering without visual jitter.
- [ ] Filter changes execute instantly with zero UI freezing.
- [ ] Mobile touch scrolling verified on standard iOS Safari and Android Chrome viewports.
