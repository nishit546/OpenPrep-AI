---
title: '[SECURITY]: Token Bucket API Rate Limiting and Strict Prompt Injection Sanitizer'
labels: 'security, backend, high-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
Security / DevSecOps / LLM Safety

## Priority
P1 High

## Summary
Implement robust token-bucket rate limiting across public and authenticated API routes along with regex/heuristics-based prompt injection filtering for student AI inputs.

## Problem Statement
Open AI chat inputs and quiz generation endpoints lack strict prompt injection defenses and IP/User rate limits, leaving the platform vulnerable to API quota depletion, denial-of-service, and jailbreak prompt injection attacks.

## Current Behavior
Basic Express middleware without token-bucket granularity or prompt sanitization on Gemini input fields.

## Expected Behavior
Tiered rate limiting (e.g. 60 req/min for free users, 10 req/min for expensive AI routes) returning standard HTTP 429 `Retry-After` headers, and AI prompt parser rejecting jailbreak keywords (`ignore previous instructions`, `system override`).

## User Story
As a platform administrator
I want to protect AI services against abuse and prompt jailbreaking
So that system availability and AI model integrity remain secure for all learners

## Proposed Solution
1. Integrate `express-rate-limit` with `rate-limit-redis` for distributed multi-instance rate limiting.
2. Create `backend/src/middleware/aiSanitizer.js` to scan incoming prompts against jailbreak signatures and strip dangerous markdown/script vectors.
3. Implement structured error responses returning JSON with standard `Retry-After` metadata.

## Technical Scope

### Frontend Impact
Display user-friendly cooldown warning countdown on UI when 429 response is received.

### Backend Impact
Add rate limiting middleware to `/api/ai/*`, `/api/auth/*`, and `/api/quizzes/*`.

### Database Impact
Redis for rate limit token tracking.

### API Impact
Standardized 429 Too Many Requests response schema.

## Acceptance Criteria
- [ ] Exceeding rate limit returns HTTP 429 with correct `Retry-After` header.
- [ ] Prompt injection payload attempts are flagged, blocked with HTTP 400, and logged in security audit logs.
- [ ] Legitimate user requests pass through with negligible middleware latency (<2ms).

## Testing Requirements

### Unit Tests
- [ ] Automated test suite verifying rate limiter trigger and prompt injection regex test cases.

### Manual Testing
- [ ] Send bursts of 20 rapid requests using Postman/curl and verify 429 status response.

## Affected Areas
- [x] Backend
- [x] Security

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
