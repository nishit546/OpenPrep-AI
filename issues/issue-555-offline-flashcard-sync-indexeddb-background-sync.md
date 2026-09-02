---
title: '[FEAT]: Offline Flashcard Sync Engine with Conflict-Free IndexedDB & Background Sync API'
labels: 'enhancement, frontend, pwa, offline, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students often study in places with unreliable internet connections (subways, flights, remote campuses). Flashcard reviews done offline must be saved locally and reconciled seamlessly when the device goes back online without losing SM-2 spaced repetition state.

This feature builds a **Conflict-Free Offline Flashcard Sync Engine using IndexedDB & Service Worker Background Sync**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **IndexedDB Local Storage Layer (`frontend/src/services/offlineDbService.js`)**:
   - Stores flashcard decks, cards, and offline review logs in `idb` (IndexedDB wrapper).
   - Tracks local mutation queue with timestamps (`reviewLogQueue`).
2. **Background Sync Worker (`frontend/src/sw.js`)**:
   - Listens to Service Worker `sync` events (`sync-flashcard-reviews`).
   - Automatically replays pending review logs to backend when network connectivity is restored.
3. **Network Status Indicator (`frontend/src/components/common/OfflineStatusBadge.jsx`)**:
   - Clean UI pill showing "Offline Mode - X reviews queued" and "Syncing..." when re-connected.

### Backend Architecture
1. **Batch Review Reconciliation Endpoint**:
   - `POST /api/flashcards/sync-offline-batch` - Accepts array of timestamped review events, updates SM-2 intervals using last-write-wins algorithm, and returns updated deck states.

---

## Acceptance Criteria
- [ ] Students can complete flashcard review sessions completely offline.
- [ ] Offline review logs are stored reliably in IndexedDB without data loss.
- [ ] Background Sync flushes queued reviews automatically once internet connection is restored.
