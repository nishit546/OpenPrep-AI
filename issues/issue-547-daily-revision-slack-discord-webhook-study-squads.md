---
title: '[FEAT]: Automated Daily Revision Slack & Discord Webhook Integration for Study Squads'
labels: 'enhancement, backend, community, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Many student study squads already communicate on Discord servers and Slack workspaces. Bringing OpenPrep AI study notifications, daily challenge reminders, and squad leaderboard changes into these channels keeps squad members accountable and engaged.

This feature builds an **Automated Daily Revision Discord & Slack Webhook Dispatcher**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Webhook Notification Dispatcher (`backend/services/squadWebhookService.js`)**:
   - Discord Rich Embed & Slack Block Kit formatter.
   - Dispatches formatted automated messages for:
     - **Morning Daily Target**: Today's high-yield topic to revise and scheduled squad quiz.
     - **Leaderboard Updates**: Weekly XP champions and longest active streaks.
     - **Quiz Battle Invites**: One-click join links when a squad member launches a live quiz challenge.
2. **Scheduled Cron Worker**:
   - Node-cron task scheduled at user-configured local morning time (e.g. 08:00 AM).
3. **REST Endpoints**:
   - `POST /api/squads/:squadId/webhooks` - Adds and validates Discord/Slack webhook URLs.
   - `POST /api/squads/:squadId/webhooks/test` - Sends a test notification payload to verify connectivity.
   - `DELETE /api/squads/:squadId/webhooks/:webhookId` - Removes webhook integration.

### Frontend Architecture
1. **Squad Integrations Settings Tab (`frontend/src/components/squads/SquadIntegrationsTab.jsx`)**:
   - Simple configuration form to paste webhook URL, select notification events, and send test ping.

---

## Acceptance Criteria
- [ ] Squad moderators can add Discord and Slack webhooks with one-click test message validation.
- [ ] Rich embed messages render properly with squad colors, avatars, and action links.
- [ ] Webhook failures (e.g., 404/410 from deleted channel) are logged and deactivated gracefully.
