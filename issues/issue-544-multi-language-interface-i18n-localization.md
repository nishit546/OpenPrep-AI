---
title: '[FEAT]: Multi-Language Interface Localization (i18n) Supporting Hindi, Spanish, French & German'
labels: 'enhancement, frontend, ui/ux, good first issue, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
OpenPrep AI serves diverse students worldwide, including non-native English speakers taking bilingual national competitive entrance exams. Navigating UI menus, analytics labels, and study planners in their native language significantly improves usability.

This feature implements **Full Multi-Language Interface Localization (i18n)** with initial support for Hindi, Spanish, French, German, and English.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **i18next Framework Setup (`frontend/src/i18n/index.js`)**:
   - Configures `react-i18next` with lazy-loaded translation JSON namespace bundles (`common.json`, `quiz.json`, `flashcards.json`, `dashboard.json`, `auth.json`).
2. **Language Selector Component (`frontend/src/components/common/LanguageSelector.jsx`)**:
   - Dropdown in navbar and footer with country flags and native script names (e.g., "English", "हिन्दी", "Español", "Français", "Deutsch").
3. **Localized DateTime & Number Formatting**:
   - Format quiz timestamps, countdown timers, and accuracy percentages using native `Intl.DateTimeFormat` and `Intl.NumberFormat`.
4. **Persistent Locale Preference**:
   - Stored in localStorage and synced with user profile in backend.

---

## Acceptance Criteria
- [ ] All primary UI views (Auth, Dashboard, Quiz, Flashcards, Study Planner) support dynamic language switching.
- [ ] Language selection updates instantly without requiring a full page refresh.
- [ ] Fallback to English if translation key is missing in target locale.
