---
title: '[FEAT]: Cross-Platform Progressive Web App (PWA) Offline Sync with IndexedDB & Service Worker Cache'
labels: 'enhancement, pwa, offline, frontend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Students frequently study in environments with unstable or nonexistent internet connectivity (subways, rural areas, airplane travel). Currently, losing internet connection interrupts flashcard reviews and quiz attempts in OpenPrep AI.

This feature converts OpenPrep AI into a **Fully Capable Offline-First Progressive Web App (PWA)** with Workbox service worker caching, IndexedDB persistence, and background sync.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Workbox Service Worker & Caching Strategy (`frontend/src/service-worker.js`)**:
   - App shell (HTML, CSS, JS bundles, fonts) cached via Stale-While-Revalidate strategy.
   - Subject icons and static assets cached via Cache-First strategy with TTL expiration.
2. **IndexedDB Local Data Store (`frontend/src/services/offlineStorage.js`)**:
   - Uses `idb` wrapper to persist active flashcard decks, study notes, and in-progress quiz questions locally on device.
   - Mutation queue store for recording offline flashcard reviews and quiz submissions.
3. **Background Sync & Online Reconciliation (`frontend/src/services/syncManager.js`)**:
   - Listens for `window.addEventListener('online')` and utilizes Service Worker Background Sync API (`sync` event).
   - Replays queued mutations to backend endpoints in FIFO order and reconciles local state with server response.
4. **Offline Mode Status Indicator & Banner**:
   - Non-intrusive floating indicator indicating offline mode and count of pending mutations waiting to sync.

---

## Acceptance Criteria
- [ ] Students can install OpenPrep AI to desktop and mobile home screens via PWA install prompt.
- [ ] Flashcards and active quizzes remain 100% playable while completely disconnected from the internet.
- [ ] Offline review attempts are automatically synced to the backend when connection is restored.
- [ ] Offline status banner updates smoothly with zero data loss.
