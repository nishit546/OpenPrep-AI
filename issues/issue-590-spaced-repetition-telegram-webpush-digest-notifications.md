---
title: '[FEAT]: Automated Study Deck Spaced Repetition Notification Engine via Web Push, Telegram Bot & Email Digests'
labels: 'enhancement, flashcards, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Spaced repetition algorithms (like SM-2 / FSRS) rely critically on reviewing flashcards at exact optimal intervals. If students forget to log into the web app, their review queues accumulate into intimidating backlogs, leading to study abandonment.

This feature establishes an **Automated Omnichannel Spaced Repetition Notification Engine** supporting Browser Web Push, an interactive Telegram Bot, and morning study email digests.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Background Schedule Worker (`backend/workers/spacedRepetitionNotificationWorker.js`)**:
   - BullMQ / Node-Cron worker running hourly to scan users with flashcards whose `nextReviewDate \le NOW()`.
   - Aggregates due counts grouped by Subject and priority level, factoring in user timezone preferences.
2. **Telegram Bot Integration (`backend/services/telegramBotService.js`)**:
   - Connects Telegram account via one-click deep link auth code.
   - Commands:
     * `/due` - Displays number of due flashcards with quick links.
     * `/quickreview` - Sends interactive inline quiz cards directly within Telegram chat with 1-5 quality rating buttons.
3. **Web Push Notification Service (`backend/services/webPushService.js`)**:
   - VAPID key exchange, subscription storage in DB, and payload dispatch with actionable notification buttons ("Review Now", "Snooze 1 Hour").
4. **Morning Email Digest Generator (`backend/services/emailDigestService.js`)**:
   - Beautiful HTML responsive template summarizing today's revision agenda, active streak status, and motivational quote.

### Frontend Architecture
1. **Notification Preferences Settings (`frontend/src/components/settings/NotificationPreferences.jsx`)**:
   - Granular toggles for Web Push, Telegram alerts, and Email digests.
   - Time-of-day picker for morning digest delivery (e.g., 07:30 AM local time).
   - "Connect Telegram" QR code and deep-link launcher.

---

## Acceptance Criteria
- [ ] Web Push notifications trigger accurately at the scheduled user preference time when cards are due.
- [ ] Telegram bot responds to `/due` and allows rating flashcards directly through inline keyboard callbacks.
- [ ] Users can toggle individual notification channels and set custom quiet hours in settings.
- [ ] Worker processes batch notifications with rate-limiting to prevent spamming notification providers.
