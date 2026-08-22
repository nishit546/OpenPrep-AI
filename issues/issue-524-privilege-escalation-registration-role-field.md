---
title: '[SECURITY]: Privilege Escalation — Registration Endpoint Accepts role Field from Client'
labels: 'ECSoC26, ECSoC26-L2, security, backend, authentication, critical'
assignees: ''
---

## Issue Type
Security / Privilege Escalation

## Priority
P0 Critical

## Summary
The user registration endpoint destructures `role` directly from the request body and passes it to `User.create()`. Although the Zod validation schema uses `.strict()` (which should reject unknown keys), the controller code still destructures and trusts `role` from user input. This creates a defense-in-depth gap where any bypass of validation middleware (or future middleware removal) immediately grants admin access to any registrant.

## Problem Statement
In `backend/controllers/authController.js` lines 65 and 72–77:

```javascript
const { name, email, password, role } = req.body;
// ...
user = await User.create({
  name,
  email,
  password,
  role: role || 'bestudent',
});
```

The `role` field is taken directly from the client request. While the Zod `registerSchema` (in `middleware/validate.js:37–67`) uses `.strict()` — which should reject unknown properties — the controller code still destructures `role` and passes it through. This is dangerous because:

1. **Defense-in-depth failure:** If validation middleware is ever removed, reordered, or bypassed (e.g., a new route added without `validateRequest`), any user can self-register as `admin`.
2. **Maintenance hazard:** Future contributors may not realize the schema is the only thing preventing privilege escalation and may add routes that skip validation.
3. **No server-side whitelist:** There is no explicit server-side check that `role` is one of the allowed values (`student`). The controller trusts whatever arrives.

## Current Behavior
- User sends `POST /api/auth/register` with `{ "name": "Attacker", "email": "a@b.com", "password": "StrongPass1!", "role": "admin" }`
- If Zod `.strict()` is working: request is rejected with validation error (correct)
- If Zod is bypassed or removed: user is created with `role: "admin"` and full admin privileges

## Expected Behavior
- The `role` field from user input is **never** used during registration
- Only `name`, `email`, and `password` are accepted from the request body
- All new registrations are hardcoded to `role: 'student'`
- Admin role assignment is only possible through the admin controller with `requireAdmin` middleware

## Root Cause Analysis
The controller was written to accept `role` for flexibility (e.g., seeding, testing) but this creates a security risk in production. The correct pattern is to never trust client input for authorization fields.

## User Story
As a platform administrator
I want user registration to always create student accounts
So that no attacker can gain admin access through the public registration form

## Proposed Solution
Remove `role` from the destructured request body and hardcode it to `'student'`:

```javascript
// BEFORE
const { name, email, password, role } = req.body;
// ...
user = await User.create({
  name,
  email,
  password,
  role: role || 'bestudent',
});

// AFTER
const { name, email, password } = req.body;
// ...
user = await User.create({
  name,
  email,
  password,
  role: 'student',
});
```

If admin seeding is needed, create a separate script or admin-only endpoint with `requireAdmin` middleware.

## Technical Scope

### Backend Impact
- **File:** `backend/controllers/authController.js`
  - **Line 65:** Remove `role` from destructuring
  - **Lines 72–77:** Replace `role: role || 'student'` with `role: 'student'`

### Frontend Impact
None — the frontend registration form should not have a role selector.

### Database Impact
None — the `role` column already defaults to `'student'` in the User model.

### API Impact
`POST /api/auth/register` no longer accepts a `role` parameter. Any client sending `role` will have it silently ignored.

### Infrastructure Impact
None.

## Acceptance Criteria
- [ ] `role` is not destructured from `req.body` in the `register` function
- [ ] New users are always created with `role: 'student'`
- [ ] Sending `role: "admin"` in the registration request has no effect
- [ ] Admin accounts can only be created through the admin controller (`/api/admin/*`) with `requireAdmin` middleware
- [ ] Existing tests pass
- [ ] No other endpoint accepts `role` from unauthenticated users

## Edge Cases
- [ ] Verify that the `authorize` middleware still correctly restricts admin routes
- [ ] Verify that the seed script (`scripts/seed.js`) creates admin users directly (bypassing the controller)

## Security Considerations
This is a privilege escalation vulnerability. Even though Zod `.strict()` currently prevents exploitation, the controller should never trust authorization fields from client input as a defense-in-depth measure.

## Accessibility Considerations
None.

## Performance Considerations
None.

## Testing Requirements

### Unit Tests
- [ ] Test: `POST /api/auth/register` with `role: "admin"` creates a user with `role: "student"`
- [ ] Test: `POST /api/auth/register` without `role` creates a user with `role: "student"`
- [ ] Test: `GET /api/admin/*` returns 403 for a newly registered user

### Integration Tests
- [ ] Full flow: register → login → attempt admin endpoint → verify 403

### Manual Testing
- [ ] Use Postman/curl to send registration with `"role": "admin"` → verify user is created as `student`

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
- [ ] `role` removed from registration destructuring
- [ ] All registrations create student accounts
- [ ] Acceptance criteria met
- [ ] Tests added
- [ ] Documentation updated
- [ ] Ready for production
