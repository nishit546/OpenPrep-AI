---
title: '[FEAT]: OLED Pure Black Theme & Dynamic Colorblind Palette Filter Modes (Protanopia, Deuteranopia, Tritanopia)'
labels: 'accessibility, frontend, ui/ux, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
Late-night study sessions cause eye fatigue on standard high-contrast gray dark modes, while draining battery on mobile OLED displays. Furthermore, approximately 8% of male and 0.5% of female students experience varying forms of color vision deficiency (Protanopia, Deuteranopia, Tritanopia), which makes interpreting color-coded charts (e.g. weakness heatmaps and accuracy graphs) challenging.

This feature adds a **True OLED `#000000` Dark Mode** and **Dynamic Colorblind Accessible Palette Modes** with full WCAG 2.1 AAA contrast compliance.

---

## Technical Scope & Architecture

### Frontend Color Matrix & Accessibility Engine
1. **OLED Pure Black Theme (`frontend/src/styles/themes/oled.css`)**:
   - Replaces dark gray background variables (`--bg-primary: #121212`) with true black (`#000000`) to completely shut off OLED pixels and maximize power efficiency on mobile devices.
   - Preserves subtle border contrasts (`--border-subtle: #222222`) and text readability (`#EDEDED`).
2. **Colorblind Filter Engine (`frontend/src/components/accessibility/ColorFilterProvider.jsx`)**:
   - Injects SVG color matrix filters for client-side visual simulation and compensation:
     - **Protanopia (Red-Blind)**: Shifts red/green chart indicators to blue/orange palettes.
     - **Deuteranopia (Green-Blind)**: High-contrast yellow/blue and textured stroke differentiators.
     - **Tritanopia (Blue-Blind)**: High-contrast cyan/magenta mappings.
   - Applies dual-encoding (pattern fills + shapes + icons) alongside colors in all Recharts/D3 visualizations.

---

## Acceptance Criteria
- [ ] OLED theme renders pure `#000000` background surfaces across all dashboard views.
- [ ] Instant toggle between Default Dark, OLED Black, Protanopia, Deuteranopia, and Tritanopia modes.
- [ ] All charts, heatmaps, and badges meet WCAG AAA contrast ratio ($\ge 7:1$ for normal text).
- [ ] Preference persists automatically across browser reloads via localStorage.
