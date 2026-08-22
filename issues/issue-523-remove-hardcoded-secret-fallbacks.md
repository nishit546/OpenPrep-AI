---
title: '[SECURITY]: Remove Hardcoded Secret Fallbacks — JWT, CSRF, Encryption Key, Database Credentials'
labels: 'ECSoC26, ECSoC26-L2, security, backend, critical'
assignees: ''
---

## Issue Type
Security / Hardcoded Secrets

## Priority
P0 Critical

## Summary
Six locations across the backend use hardcoded fallback values for sensitive secrets (JWT signing key, CSRF secret, encryption key, database credentials). If any environment variable is missing, the application silently falls back to a publicly-visible default, completely undermining authentication, CSRF protection, and data encryption.

## Problem Statement
The codebase uses the `|| 'fallback'` pattern for secrets in multiple files. While `config/env.js` validates environment variables in production, **development and staging environments** silently use known defaults. Since this is an open-source project, these hardcoded values are visible to every contributor and attacker.

### Affected Locations

| # | File | Line | Hardcoded Value | Protects |
|---|------|------|----------------|----------|
| 1 | `backend/controllers/authController.js` | 24 | `'supersecret_openprep_key'` | JWT token signing — all user sessions |
| 2 | `backend/middleware/securityMiddleware.js` | 4 | `'super_secret_csrf_key_12345!'` | CSRF token generation — all state-changing requests |
| 3 | `backend/utils/encryption.js` | 13 | `'default_test_encryption_key_must_change'` | AES-256-GCM encryption — OAuth refresh tokens |
| 4 | `backend/config/db.js` | 3 | `'postgresql://postgres:NISHIT382424@db.eymuyrdtbinvexvaynxw.supabase.co:5432/postgres'` | Database connection — all user data |
| 5 | `backend/config/database.js` | 1 | Same Supabase connection string (duplicated) | Sequelize CLI config |
| 6 | `backend/scripts/db-backup.js` | 9 | Same Supabase connection string (duplicated) | Database backup operations |

### Impact Analysis

**JWT Secret (#1):** An attacker who knows the signing key can forge valid JWTs for any user ID. Combined with the open-source nature of the project, anyone can create admin tokens.

**CSRF Secret (#2):** The double-submit cookie CSRF pattern relies on the server knowing a secret the attacker doesn't. With the hardcoded fallback, an attacker can generate valid CSRF tokens and bypass all state-changing request protections.

**Encryption Key (#3):** OAuth refresh tokens (Google Calendar sync, etc.) are encrypted with AES-256-GCM using this key. Anyone with the key can decrypt these tokens and impersonate users on third-party services.

**Database Credentials (#4-6):** The Supabase connection string with a plaintext password is hardcoded as the fallback. If `DATABASE_URL` is unset, the app connects to a real database with known credentials.

## Current Behavior
- In development (missing env vars): app silently uses known defaults for all secrets
- In production: `config/env.js` catches missing vars and throws at startup (good)
- In staging/CI: depends on whether `NODE_ENV === 'production'` is set

## Expected Behavior
The application **never starts** with a fallback secret for any of these values. Missing secrets are caught immediately at startup with a clear error message.

## Root Cause Analysis
The hardcoded fallbacks were likely added during initial development to "make the app work without configuration." They should have been replaced with startup validation once `config/env.js` was implemented.

## User Story
As a security-conscious developer
I want the application to fail fast if any secret is missing
So that no deployment ever runs with a known, publicly-visible signing key

## Proposed Solution
Replace every `process.env.X \|\| 'hardcoded'` pattern with an explicit check that throws if the env var is missing.

### 1. `authController.js:24` — JWT Secret
```javascript
// BEFORE
return jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET || 'supersecret_openprep_key', {

// AFTER
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
return jwt.sign({ id, type: 'access' }, jwtSecret, {
```

### 2. `securityMiddleware.js:4` — CSRF Secret
```javascript
// BEFORE
getSecret: () => process.env.CSRF_SECRET || 'super_secret_csrf_key_12345!',

// AFTER
getSecret: () => {
  const secret = process.env.CSRF_SECRET;
  if (!secret) throw new Error('CSRF_SECRET environment variable is required');
  return secret;
},
```

### 3. `encryption.js:13` — Encryption Key
```javascript
// BEFORE
const secret = process.env.ENCRYPTION_KEY || 'default_test_encryption_key_must_change';

// AFTER
const secret = process.env.ENCRYPTION_KEY;
if (!secret) throw new Error('ENCRYPTION_KEY environment variable is required');
```

### 4-6. `db.js:3`, `database.js:1`, `db-backup.js:9` — Database Credentials
Remove the hardcoded Supabase URL fallback. Throw if `DATABASE_URL` is not set.

## Technical Scope

### Backend Impact
- **Files to modify:**
  - `backend/controllers/authController.js` — line 24
  - `backend/middleware/securityMiddleware.js` — line 4
  - `backend/utils/encryption.js` — line 13
  - `backend/config/db.js` — line 3
  - `backend/config/database.js` — line 1
  - `backend/scripts/db-backup.js` — line 9

### Frontend Impact
None.

### Database Impact
None — the fix ensures the correct database is used rather than a hardcoded fallback.

### API Impact
None — behavior is identical when env vars are properly set (production). In dev, developers must set env vars.

### Infrastructure Impact
All deployment environments must have the env vars set. The `.env.example` file should be updated to include all required secrets (it likely already does).

## Acceptance Criteria
- [ ] `authController.js` throws at startup if `JWT_SECRET` is not set
- [ ] `securityMiddleware.js` throws at startup if `CSRF_SECRET` is not set
- [ ] `encryption.js` throws at startup if `ENCRYPTION_KEY` is not set
- [ ] `db.js` throws at startup if `DATABASE_URL` is not set
- [ ] `database.js` does not contain a hardcoded connection string
- [ ] `db-backup.js` does not contain a hardcoded connection string
- [ ] No hardcoded secret values remain in source code (grep for known values returns zero results)
- [ ] `.env.example` documents all required secret variables
- [ ] Server starts successfully with all env vars set
- [ ] Server fails immediately with clear error messages when any secret is missing

## Edge Cases
- [ ] Test environments: provide a test `.env` or mock the env vars in test setup
- [ ] Docker: ensure `docker-compose.yml` passes all required env vars
- [ ] CI/CD: ensure GitHub Actions secrets are configured for all required variables

## Security Considerations
This is the security fix itself. Every hardcoded fallback is a potential credential leak in an open-source repository.

## Accessibility Considerations
None.

## Performance Considerations
Startup validation adds negligible overhead (a few synchronous `if` checks).

## Testing Requirements

### Unit Tests
- [ ] Test: `generateAccessToken()` throws when `JWT_SECRET` is unset
- [ ] Test: `doubleCsrfOptions.getSecret()` throws when `CSRF_SECRET` is unset
- [ ] Test: `getKey()` throws when `ENCRYPTION_KEY` is unset
- [ ] Test: `sequelize` connection fails with clear error when `DATABASE_URL` is unset

### Manual Testing
- [ ] Remove `JWT_SECRET` from `.env` → verify server fails with `"JWT_SECRET environment variable is required"`
- [ ] Remove `CSRF_SECRET` from `.env` → verify server fails with `"CSRF_SECRET environment variable is required"`
- [ ] With all env vars set → verify server starts normally

## Affected Areas
- [x] Backend
- [x] Security
- [x] Authentication

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] All 6 hardcoded fallbacks removed
- [ ] Server fails fast with clear errors for missing secrets
- [ ] No hardcoded secrets in source code (verified via grep)
- [ ] `.env.example` updated
- [ ] Acceptance criteria met
- [ ] Documentation updated
- [ ] Ready for production
