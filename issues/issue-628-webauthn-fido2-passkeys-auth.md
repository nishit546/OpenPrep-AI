---
title: '[FEAT]: Passwordless Authentication with WebAuthn Passkeys (Face ID, Touch ID, Windows Hello)'
labels: 'security, auth, fullstack, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Password-based authentication leads to password reuse, forgot-password support overhead, and credential phishing risks. Modern browser standards support FIDO2 / WebAuthn Passkeys, allowing users to sign in frictionlessly and securely using native hardware biometrics (Apple Face ID / Touch ID, Android Biometrics, Windows Hello, and YubiKeys).

This feature integrates **WebAuthn Passkey Registration and Passwordless Login** into OpenPrep AI.

---

## Technical Scope & Architecture

### Backend WebAuthn Handshake
1. **Passkey Auth Service (`backend/services/passkeyAuthService.js`)**:
   - Integrates `@simplewebauthn/server` for FIDO2 challenge generation and attestation/assertion verification.
   - Database model `user_passkeys`: `id`, `user_id`, `credential_id` (BYTEA), `public_key` (BYTEA), `counter` (BIGINT), `device_name`, `created_at`.
   - `POST /api/auth/passkey/register-challenge`: Generates cryptographically random challenge stored in Redis session (60s TTL).
   - `POST /api/auth/passkey/register-verify`: Validates client signature and stores public key.
   - `POST /api/auth/passkey/login-challenge` & `POST /api/auth/passkey/login-verify`: Verifies authentication assertion and issues JWT session cookie.

### Frontend Biometric Integration
1. **Passkey Client Handler (`frontend/src/services/passkeyClient.js`)**:
   - Integrates `@simplewebauthn/browser` with autofill UI (`navigator.credentials.get({ mediation: 'conditional' })`).
   - Management UI in user settings to view and revoke registered passkey devices.

---

## Acceptance Criteria
- [ ] Students can register passkeys using Touch ID, Face ID, Windows Hello, or hardware security keys.
- [ ] Frictionless passwordless one-tap login supported via browser conditional UI autofill.
- [ ] Multi-device passkey management dashboard allowing students to name and delete passkeys.
- [ ] Strict cryptographic validation preventing replay attacks and signature spoofing.
