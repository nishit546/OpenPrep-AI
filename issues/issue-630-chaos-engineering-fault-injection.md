---
title: '[TEST]: Chaos Engineering & Network Fault Injection Test Suite for Distributed Services'
labels: 'testing, devops, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
During peak exam seasons, OpenPrep AI experiences concurrent spikes in quiz generation, real-time study rooms, and database analytics queries. Unpredicted upstream latency spikes (e.g. Gemini API timeouts, Redis disconnects, database connection pool exhaustion) can trigger cascading service failures if resiliency fallbacks are untested.

This feature establishes an **Automated Chaos Engineering & Fault Injection Test Suite** using Toxiproxy and Jest to systematically validate system resilience under simulated network partitions, service latency, and partial outages.

---

## Technical Scope & Architecture

### Chaos Testing Framework & Scenarios
1. **Toxiproxy Test Harness (`tests/chaos/chaosHarness.js`)**:
   - Integrates `toxiproxy-node-client` in CI pipeline to introduce simulated network failures:
     - **Latency & Jitter**: Inject 5,000ms delay on external AI API endpoints.
     - **Bandwidth Throttling & Packet Drops**: Simulate slow 3G mobile connections for PDF uploads.
     - **Connection Refused**: Abruptly terminate Redis cache and test in-memory fallback queues.
     - **Database Pool Saturation**: Exhaust PostgreSQL connection pool to verify graceful 503 error handling.
2. **Chaos Scenarios & Assertions (`tests/chaos/resilience.test.js`)**:
   - Verify BullMQ retry mechanisms with exponential backoff on AI provider failure.
   - Verify circuit breaker trips correctly and returns cached study materials when upstream API is degraded.
   - Verify that client WebSocket reconnections recover gracefully without losing student quiz state.

---

## Acceptance Criteria
- [ ] Chaos suite automatically runs in CI against isolated Docker containers.
- [ ] Backend maintains $< 0.1\%$ unhandled 500 error rate when external AI services suffer 5s latency or packet drop toxics.
- [ ] Circuit breaker successfully opens, serving cached responses and preventing thread pool starvation.
- [ ] Generates automated resilience audit reports summarizing MTTR (Mean Time to Recovery).
