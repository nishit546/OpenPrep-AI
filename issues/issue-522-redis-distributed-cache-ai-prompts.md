---
title: '[PERF]: Distributed Redis Caching for AI Quiz & Flashcard Prompt Memoization'
labels: 'enhancement, backend, ai, database, medium-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Issue Type
Performance Optimization / Backend Caching / AI Optimization

## Priority
P2 Medium

## Summary
Introduce an enterprise-grade Redis caching layer for LLM (Gemini API) quiz generation and syllabus queries using SHA-256 prompt hashing and TTL expiration.

## Problem Statement
Duplicate or near-identical AI quiz generation requests for common exam topics (e.g., "UPSC Modern History 1857 Revolt", "JEE Physics Thermodynamics") hit the external Gemini API repeatedly, incurring API quota costs and introducing 3-6 second latency per request.

## Current Behavior
Every quiz generation request triggers a cold call to the Gemini API, regardless of whether identical syllabus parameters were requested minutes earlier.

## Expected Behavior
Identical topic/difficulty quiz requests serve cached responses from Redis in under 25ms, drastically cutting Gemini API billing and boosting response speeds.

## User Story
As an OpenPrep student
I want instant quiz generation for standard syllabus topics
So that I can begin practicing immediately without waiting for API generation latency

## Proposed Solution
1. Create `backend/src/services/cacheService.js` utilizing `ioredis` with automatic reconnection and fallback to in-memory cache if Redis is offline.
2. Implement SHA-256 canonical hashing of `{ subject, topic, difficulty, questionCount }` request payloads.
3. Set dynamic TTL: 24 hours for standard syllabus quizzes, 7 days for textbook summary extractions, with cache invalidation endpoints.

## Technical Scope

### Frontend Impact
None.

### Backend Impact
Install `ioredis`, add `backend/src/services/cacheService.js`, and wrap `geminiService.js` calls with cache interception.

### Database Impact
Redis key-value store with prefix namespacing `openprep:cache:quiz:*`.

### API Impact
Add `X-Cache-Status: HIT | MISS` response headers on `/api/quizzes/generate`.

## Acceptance Criteria
- [ ] Second identical quiz generation request returns in <50ms with `X-Cache-Status: HIT`.
- [ ] Graceful fallback executes external Gemini API call without throwing errors if Redis connection drops.
- [ ] Cache eviction TTLs configured correctly across different payload types.

## Testing Requirements

### Unit Tests
- [ ] Unit tests testing cache hit, cache miss, and Redis connection failure fallback.

### Manual Testing
- [ ] Verify Redis key creation using `redis-cli KEYS "openprep:*"`.

## Affected Areas
- [x] Backend
- [x] Database
- [x] AI

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 3 (Hard / Advanced) (ECSoC26-L3)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
