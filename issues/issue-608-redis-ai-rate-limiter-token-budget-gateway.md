---
title: '[FEAT]: Automated Rate Limiter & Token Budgeting Gateway for Google Gemini AI API with Fallback Queue'
labels: 'enhancement, ai, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Uncontrolled concurrent requests to the Google Gemini AI API can quickly exhaust API rate limits (HTTP 429 Too Many Requests), deplete monthly token budgets, and cause sudden service outages during peak study hours.

This feature implements a **Redis Token Bucket Rate Limiter, Intelligent AI Prompt Caching Gateway, and Priority Request Queue**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Redis Sliding Window & Token Bucket Gateway (`backend/services/aiGatewayService.js`)**:
   - Tracks per-user and global token consumption per minute (TPM) and requests per minute (RPM).
   - Tiered user budgeting: Free tier ($50\text{k tokens/day}$), Pro tier ($500\text{k tokens/day}$).
   - SHA-256 prompt input fingerprinting: identical questions return cached AI responses directly from Redis with zero API cost and $< 10\text{ms}$ latency.
2. **Resilient Retry & Priority Queue (`backend/services/aiRequestQueue.js`)**:
   - BullMQ priority queue: interactive real-time user requests (Chat/Quiz) prioritized over background batch tasks (Summary extraction).
   - Exponential backoff with jitter on HTTP 429 / 503 upstream errors.
3. **Admin Telemetry Endpoint (`backend/controllers/aiGatewayController.js`)**:
   - `GET /api/admin/ai-gateway/metrics` - Returns real-time token burn rates, cache hit ratios, and queue latency.

---

## Acceptance Criteria
- [ ] Blocks or queues requests exceeding rate limits without throwing unhandled server errors.
- [ ] Prompt cache serves identical queries from Redis with sub-15ms response times.
- [ ] Queue handles upstream 429 spikes gracefully using exponential backoff retries.
- [ ] Unit and load tests confirm token budgeting enforcement under concurrent stress.
