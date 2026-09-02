---
title: '[FEAT]: Cross-Platform Dark Mode Contrast Engine with Solarized & OLED Themes (WCAG AAA Compliance)'
labels: 'enhancement, ui/ux, accessibility, frontend, good first issue, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Students study for long hours at night and on various devices (OLED mobile screens, laptops in dark rooms). Standard dark themes can suffer from low contrast ratios, causing eye strain and failing accessibility standards.

This feature introduces a **Cross-Platform Dark Mode Contrast Engine with Solarized, Midnight OLED, and High-Contrast WCAG 2.1 AAA Accessibility Themes**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Theme Design System Tokens (`frontend/src/styles/themeTokens.css`)**:
   - CSS Custom Properties (`--bg-canvas`, `--text-primary`, `--border-subtle`, `--accent-glow`) with 5 curated color schemes:
     - **Light Aurora**: Clean daylight study mode.
     - **Dark Slate**: Standard balanced dark mode.
     - **Midnight OLED**: True pure black (`#000000`) for battery savings and high contrast on OLED screens.
     - **Solarized Warm**: Amber sepia tone designed for circadian eye comfort during late-night cram sessions.
     - **High-Contrast AAA**: 7:1 minimum contrast ratio compliant with WCAG 2.1 AAA standards.
2. **Theme Switcher & Quick Keybinding (`frontend/src/components/common/ThemeSelector.jsx`)**:
   - Smooth CSS color transitions without flashing (FOUC).
   - Global shortcut (`Ctrl/Cmd + Shift + T`) to cycle themes.
   - System preference sync (`prefers-color-scheme: dark`) with local storage fallback.

---

## Acceptance Criteria
- [ ] Supports seamless switching between Light, Dark Slate, OLED Midnight, Solarized Warm, and High-Contrast AAA.
- [ ] Zero page flicker (FOUC) on page reload.
- [ ] Complies with WCAG 2.1 AAA contrast requirements on text and interactive elements.
