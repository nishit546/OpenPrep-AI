---
title: '[SECURITY]: Google OAuth Account Takeover — jwt.decode() Bypasses Token Signature Verification'
labels: 'ECSoC26, ECSoC26-L2, security, backend, authentication, critical'
assignees: ''
---

## Issue Type
Security / Authentication Bypass

## Priority
P0 Critical

## Summary
The Google OAuth login flow falls back to `jwt.decode()` when `googleClient.verifyIdToken()` fails. Unlike `verifyIdToken()`, `jwt.decode()` does **not** verify the token's cryptographic signature. An attacker can craft a valid-looking JWT with any email address and use it to create or access arbitrary accounts on the platform.

## Problem Statement
In `backend/controllers/authController.js` lines 548–568:

```javascript
try {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  email = payload.email;
  name = payload.name;
  googleId = payload.sub;
  picture = payload.picture;
} catch (verifyErr) {
  // Fallback: decode JWT token
  const payload = jwt.decode(credential);
  if (!payload || !payload.email) {
    return res.status(400).json({ success: false, error: 'Invalid Google credential' });
  }
  email = payload.email;
  name = payload.name || payload.given_name;
  googleId = payload.sub;
  picture = payload.picture;
}
```

When `googleClient.verifyIdToken()` throws (network error, invalid audience, expired token, tampered token), the catch block falls back to `jwt.decode(credential)`. This function:

1. **Does NOT verify the token signature** — it simply base64-decodes the payload
2. **Does NOT check the issuer** — it doesn't verify the token came from Google
3. **Does NOT check expiration** — it accepts expired tokens

An attacker can craft a JWT with header `{"alg":"none"}` and payload `{"email":"victim@example.com","sub":"fake-google-id"}`, base64url-encode it, and send it as the `credential` parameter. The server will decode it, extract the email, and create/login an account for that email.

## Current Behavior
- Attacker crafts a JWT with `email: "admin@target.com"` and no valid signature
- Attacker sends `POST /api/auth/google` with this crafted credential
- `googleClient.verifyIdToken()` fails (invalid signature)
- Catch block calls `jwt.decode(credential)` which succeeds
- Server creates or logs into the account for `admin@target.com`

## Expected Behavior
- When `googleClient.verifyIdToken()` fails, the request is rejected with 400/401
- No fallback token decoding occurs
- Only cryptographically verified Google tokens are accepted

## Root Cause Analysis
The `jwt.decode()` fallback was likely added as a workaround for development/testing environments where Google API credentials aren't configured. However, it creates a critical authentication bypass in any environment.

## User Story
As a platform user
I want only verified Google authentication tokens to be accepted
So that no one can impersonate me by crafting a fake token

## Proposed Solution
Remove the `jwt.decode()` fallback entirely. If `verifyIdToken()` fails, reject the request:

```javascript
try {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  email = payload.email;
  name = payload.name;
  googleId = payload.sub;
  picture = payload.picture;
} catch (verifyErr) {
  return res.status(401).json({
    success: false,
    error: 'Invalid Google credential — token verification failed'
  });
}
```

If development-mode bypass is needed for testing, gate it behind `NODE_ENV === 'development'` with a clear warning log.

## Technical Scope

### Backend Impact
- **File:** `backend/controllers/authController.js`
  - **Lines 558–568:** Replace the `jwt.decode()` fallback with a 401 response

### Frontend Impact
None — the frontend already sends valid Google credentials. This fix only affects the server's handling of invalid credentials.

### Database Impact
None.

### API Impact
`POST /api/auth/google` returns 401 instead of 200 when Google token verification fails.

### Infrastructure Impact
Requires `GOOGLE_CLIENT_ID` to be properly set in the environment (which it should be for OAuth to work).

## Acceptance Criteria
- [ ] `jwt.decode()` is not used as an authentication fallback
- [ ] When `googleClient.verifyIdToken()` throws, the request returns 401
- [ ] No code path accepts an unverified JWT as a Google credential
- [ ] Valid Google OAuth flow still works correctly
- [ ] The hardcoded Google Client ID fallback (line 534) is also removed

## Edge Cases
- [ ] Google API downtime: requests fail with 401 (correct behavior — don't bypass security for availability)
- [ ] Development environment: if Google credentials are not configured, OAuth endpoints should return a clear error rather than silently accepting forged tokens
- [ ] Network timeout: `verifyIdToken()` may timeout — should still reject, not fall back

## Security Considerations
This is an authentication bypass vulnerability. Combined with the hardcoded Google Client ID fallback (line 534), an attacker can:
1. Create an account for any email address
2. Log into existing accounts
3. Gain access to all user data including notes, flashcards, study plans, and quiz history

## Accessibility Considerations
None.

## Performance Considerations
Removing the fallback simplifies the code path and removes a potential source of confusion.

## Testing Requirements

### Unit Tests
- [ ] Test: `POST /api/auth/google` with a malformed JWT returns 401
- [ ] Test: `POST /api/auth/google` with a JWT signed by a non-Google key returns 401
- [ ] Test: `POST /api/auth/google` with a valid Google token succeeds
- [ ] Test: `POST /api/auth/google` when Google API is down returns 401

### Integration Tests
- [ ] Full flow: Google OAuth login with valid credentials succeeds
- [ ] Full flow: Google OAuth login with forged credentials is rejected

### Manual Testing
- [ ] Use a JWT debugging tool to craft a token with a known email, send it to `/api/auth/google`, verify 401 response

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
- [ ] `jwt.decode()` fallback removed
- [ ] Invalid Google tokens are rejected with 401
- [ ] Valid Google OAuth flow works
- [ ] Hardcoded Google Client ID fallback removed
- [ ] Acceptance criteria met
- [ ] Tests added
- [ ] Documentation updated
- [ ] Ready for production
