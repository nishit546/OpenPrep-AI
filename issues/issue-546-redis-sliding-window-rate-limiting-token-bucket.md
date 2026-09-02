---
title: '[FEAT]: Granular Rate-Limiting & Sliding Window Token Bucket for AI & Quiz Endpoints'
labels: 'enhancement, backend, security, infrastructure, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
AI generation routes (Gemini API question generators, note summarizers) and quiz submission endpoints are resource-intensive. Without granular rate limiting, abusive automated scripts or rapid clicks can exhaust API quotas and degrade server performance.

This feature implements a **Redis-Backed Sliding Window Rate Limiter & Token Bucket Strategy** for sensitive endpoints.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Sliding Window Rate Limiter Middleware (`backend/middleware/rateLimiter.js`)**:
   - Redis Sorted Set (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`) implementation providing millisecond-accurate sliding window rate tracking.
   - Tiered limits based on authentication status and user roles:
     - Anonymous users: 10 requests / min.
     - Authenticated standard users: 60 requests / min (AI routes: 15 / min).
     - Educators / Admins: 180 requests / min.
2. **Standardized Rate Limit Headers**:
   - Attaches `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` to all API responses.
   - Returns `429 Too Many Requests` with structured JSON error containing retry-after seconds.
3. **Graceful Fallback**:
   - In-memory LRU cache fallback if Redis connection is temporarily interrupted.

---

## Acceptance Criteria
- [ ] Accurately limits rapid repeated requests using sliding window algorithms.
- [ ] Returns RFC-compliant rate limit response headers and descriptive 429 JSON messages.
- [ ] Seamless in-memory fallback prevents API failure if Redis is unavailable.
