---
title: '[FEAT]: Redis-Backed Distributed Token Bucket Rate Limiter with Tiered User Quotas'
labels: 'enhancement, backend, security, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
As OpenPrep AI expands its AI-powered features (quiz generation, question paper analysis, oral vivas), unauthenticated or abusive automated requests can quickly exhaust upstream Gemini API quotas and degrade server performance for legitimate students.

This feature implements a **High-Performance Redis Token Bucket Rate Limiter** with role-based tiered quotas and standardized RFC-6585 HTTP 429 response headers.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Redis Atomic Lua Rate Limit Script (`backend/middleware/rateLimiter.js`)**:
   - Executes atomic Redis Lua script implementing the Token Bucket algorithm (burst allowance + smooth replenishment rate).
   - Key partitioning by User ID for authenticated users and SHA-256 hashed Client IP + User-Agent for guests.
2. **Tiered Policy Configuration Matrix (`backend/config/rateLimitTiers.js`)**:
   - **Guest / Unauthenticated**: 10 requests / min (AI endpoints locked).
   - **Standard Student**: 60 requests / min; 30 AI generations / hour.
   - **Squad Moderator / Admin**: 120 requests / min; 100 AI generations / hour.
3. **Standardized Header Injection**:
   - `X-RateLimit-Limit`: Maximum tokens in bucket.
   - `X-RateLimit-Remaining`: Tokens remaining in current window.
   - `X-RateLimit-Reset`: Unix timestamp when bucket fully refills.
   - `Retry-After`: Seconds to wait before retrying on 429 responses.

---

## Acceptance Criteria
- [ ] High-frequency burst traffic is smoothly throttled without blocking legitimate student interactions.
- [ ] Redis Lua scripts execute atomically in sub-2ms latency without race conditions.
- [ ] HTTP 429 responses include clear `Retry-After` headers and user-friendly JSON error payloads.
- [ ] Stress-tested with k6 / Jest load scripts simulating 100+ concurrent requests.
