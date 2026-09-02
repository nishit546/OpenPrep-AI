---
title: '[FEAT]: End-to-End Internationalization (i18n) Framework with RTL Support & Dynamic Locale Switching'
labels: 'enhancement, frontend, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
OpenPrep AI aims to support students globally, including non-native English speakers across India, Latin America, Europe, and the Middle East. Hardcoded English strings prevent global adoption and create barriers for students studying in their regional languages.

This feature establishes an **End-to-End Internationalization (i18n) Framework** with support for English, Hindi (हिन्दी), Spanish (Español), French (Français), and Arabic (العربية - Right-to-Left RTL layout).

---

## Technical Scope & Architecture

### Frontend Architecture
1. **i18n Engine & Locale Management (`frontend/src/i18n/index.js`)**:
   - `react-i18next` / `i18next` setup with namespace splitting (`common`, `auth`, `quiz`, `flashcards`, `dashboard`).
   - Browser language autodetection with localStorage fallback and user profile preference sync.
2. **Dynamic RTL Layout Mirroring (`frontend/src/styles/rtl.css`)**:
   - Automatic HTML `dir="rtl"` and `lang` attribute toggling when switching to Arabic.
   - CSS Logical Properties (`margin-inline-start`, `padding-inline-end`, flexbox/grid mirroring) ensuring flawless UI rendering across LTR and RTL modes.
3. **Language Switcher Navbar Component (`frontend/src/components/common/LanguageSwitcher.jsx`)**:
   - Sleek dropdown menu with native language labels and country flag icons.

### Translation Management & Linting
1. **Missing Key Linter (`scripts/lint-i18n-keys.js`)**:
   - Automated CI script scanning JSX files for untranslated raw text strings and verifying that all translation JSON files contain matching keys.

---

## Acceptance Criteria
- [ ] Instant language switching across English, Hindi, Spanish, French, and Arabic without page reload.
- [ ] Arabic locale switches the entire layout to clean Right-to-Left (RTL) alignment.
- [ ] Numbers, dates, and currency format dynamically according to the active locale.
- [ ] CI linting script validates that no hardcoded English strings or missing translation keys exist.
