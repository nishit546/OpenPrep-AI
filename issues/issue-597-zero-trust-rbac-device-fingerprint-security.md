---
title: '[FEAT]: Zero-Trust RBAC & Session Security Hardening with Device Fingerprinting & Geolocation Anomaly Detection'
labels: 'enhancement, authentication, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Student accounts frequently get shared across multiple unauthorized users or subjected to credential stuffing attacks. To safeguard user data and maintain academic integrity, the platform requires robust session management and anomaly detection.

This feature implements **Zero-Trust Role-Based Access Control (RBAC), Device Fingerprint Hashing, Refresh Token Rotation, and Geo-IP Velocity Anomaly Alerts**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Refresh Token Rotation & Revocation (`backend/services/tokenService.js`)**:
   - Issues short-lived access tokens (15m) and single-use refresh tokens (7d) stored in `httpOnly`, `secure`, `SameSite=Strict` cookies.
   - If a compromised refresh token is reused, the entire token family is immediately invalidated.
2. **Device Fingerprint & Geo Anomaly Middleware (`backend/middleware/deviceAnomalyMiddleware.js`)**:
   - Hashes client characteristics (User-Agent, Canvas hash, IP subnet).
   - Checks Impossible Travel / Velocity anomalies (e.g., login from Mumbai followed by login from New York 10 minutes later) and triggers mandatory OTP re-verification.
3. **Granular RBAC Guard (`backend/middleware/rbacMiddleware.js`)**:
   - Hierarchical permission matrix for roles: `STUDENT`, `STUDY_LEADER`, `MENTOR`, `INSTITUTION_ADMIN`, `SUPERADMIN`.
4. **REST Endpoints (`backend/controllers/securityController.js`)**:
   - `GET /api/security/active-sessions` - Lists all active device sessions with browser, IP, location, and "Revoke" button.
   - `POST /api/security/revoke-all` - Revokes all active sessions except current.

### Frontend Architecture
1. **Security & Active Sessions Dashboard (`frontend/src/components/settings/ActiveSessionsView.jsx`)**:
   - Visual device list with OS icons, approximate location flags, login timestamps, and "Log Out Other Devices" button.
   - Suspicious login alert banner prompting immediate password change when an anomalous login is detected.

---

## Acceptance Criteria
- [ ] Refresh token reuse detection revokes all active tokens for that user immediately.
- [ ] Impossible travel velocity triggers step-up authentication via email OTP.
- [ ] RBAC middleware enforces strict route protection based on role permissions.
- [ ] Security test specs verify token rotation, cookie attributes, and session revocation.
