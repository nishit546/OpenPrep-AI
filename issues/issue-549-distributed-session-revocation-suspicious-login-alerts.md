---
title: '[FEAT]: Distributed Session Revocation & Suspicious Concurrent Login Detection'
labels: 'enhancement, backend, authentication, security, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
To safeguard student accounts, protect premium course materials, and prevent unauthorized credential sharing, OpenPrep AI needs enterprise-grade active session management and suspicious login detection.

This feature implements **Distributed Session Revocation, Active Device Management & Suspicious Login Geolocation Telemetry**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Active Device & Session Tracker (`backend/services/sessionManagerService.js`)**:
   - Stores session records in PostgreSQL and Redis with device metadata (Browser, OS, IP address, approximate geolocation, and last active timestamp).
   - Generates unique Session Tokens linked to JWT `jti` claims.
2. **Session Revocation & Redis Blacklist**:
   - Single-click "Revoke Device" or "Log Out All Other Devices" that immediately invalidates session tokens in Redis.
3. **Suspicious Login Anomaly Detector**:
   - Flags logins from new IP addresses, unexpected countries, or impossible travel velocity (e.g., logins from two continents within 1 hour).
   - Sends security email alert with confirmation link to block compromised credentials.
4. **REST Endpoints**:
   - `GET /api/auth/sessions` - Lists all active devices and sessions for the current user.
   - `DELETE /api/auth/sessions/:sessionId` - Terminates a specific device session.
   - `DELETE /api/auth/sessions/other` - Revokes all sessions except the current one.

### Frontend Architecture
1. **Security & Active Devices Dashboard (`frontend/src/components/profile/ActiveSessionsManager.jsx`)**:
   - Displays device list with desktop/mobile icons, IP, location badge, and "Current Device" indicator.

---

## Acceptance Criteria
- [ ] Users can view all active logged-in sessions with device, browser, and IP location info.
- [ ] Terminating a session immediately revokes access on that target device on subsequent requests.
- [ ] Suspicious concurrent logins trigger automated security alert emails.
