---
title: '[FEAT]: Offline-First PWA Support with Service Worker & Background Sync for Reviews'
labels: 'enhancement, pwa, offline, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
New Feature / Progressive Web App / Offline Capability

## Priority
P2 Medium

## Summary
Transform OpenPrep AI into an offline-first Progressive Web App (PWA) allowing students to study downloaded flashcards offline with background sync queuing review ratings when internet reconnects.

## Problem Statement
Students commuting on trains or with intermittent mobile connectivity lose access to their flashcard decks and study material when their internet connection drops.

## Current Behavior
The application shows a browser network error screen when disconnected from the internet, preventing any offline flashcard practice.

## Expected Behavior
The app installs as a native-feeling PWA, caches active flashcard decks into browser IndexedDB via Workbox, and queues review results locally to sync with the server once internet is restored.

## User Story
As a student studying on the commute
I want to practice my flashcards without active internet connectivity
So that my review progress automatically syncs when I reconnect to Wi-Fi

## Proposed Solution
1. Configure `vite-plugin-pwa` with Workbox caching strategies (`CacheFirst` for static assets, `NetworkFirst` for profile data).
2. Implement an IndexedDB sync queue in `frontend/src/services/offlineSyncService.js` using `idb`.
3. Register Background Sync API (`SyncManager`) event to flush pending flashcard SM-2 review scores on network reconnection.

## Technical Scope

### Frontend Impact
Add `vite-plugin-pwa`, `idb`, Web App Manifest (`manifest.json`), offline badge indicator.

### Backend Impact
Add bulk review sync endpoint `POST /api/flashcards/sync-batch` handling queued timestamps.

### Database Impact
Accept client review timestamps to preserve accurate SM-2 intervals.

### API Impact
POST `/api/flashcards/sync-batch`.

## Acceptance Criteria
- [ ] PWA install prompt triggers on supported mobile and desktop browsers.
- [ ] Flashcards review works 100% offline in Airplane mode.
- [ ] Queued offline reviews automatically POST to backend when connectivity is restored, accompanied by a success sync toast.

## Testing Requirements

### Unit Tests
- [ ] Unit tests for IndexedDB queue operations and conflict resolution.

### Manual Testing
- [ ] Toggle Chrome DevTools Offline mode, complete 5 flashcard reviews, re-enable network, verify database synchronization.

## Affected Areas
- [x] Frontend
- [x] PWA
- [x] Offline

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium / Intermediate) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
