---
title: '[FEAT]: Automated End-to-End API Health Check & Latency SLO Monitor with Status Page'
labels: 'enhancement, backend, devops, infrastructure, good first issue, low-priority, ECSoC26, ECSoC26-L1'
assignees: ''
---

## Summary & Motivation
To maintain 99.9% platform availability during high-traffic exam seasons, developers and students need visibility into system health, API endpoint latencies, database connections, and external AI provider status.

This feature builds an **Automated Health Check & Latency SLO Telemetry Monitor with a Public Status Dashboard**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Comprehensive Health Check Service (`backend/services/healthCheckService.js`)**:
   - Inspects status and ping response times for:
     - PostgreSQL database connectivity (`SELECT 1`).
     - Redis cache server heartbeat.
     - Gemini AI API endpoint latency.
     - File storage / disk write capability.
     - Memory usage (RSS, heap total vs heap used) and process uptime.
2. **REST Endpoints**:
   - `GET /api/health` - Lightweight 200 OK for load balancers.
   - `GET /api/health/detailed` - Detailed JSON metrics with component status badges and ping latency.

### Frontend Architecture
1. **Public System Status Page (`frontend/src/pages/SystemStatusPage.jsx`)**:
   - Modern clean status dashboard showing:
     - Overall System Status ("All Systems Operational" / "Partial Outage").
     - Live 24-hour latency chart for core services.
     - Historical uptime percentage badges (99.98%).

---

## Acceptance Criteria
- [ ] `/api/health/detailed` returns live ping latencies for database, cache, and external APIs.
- [ ] Status page renders clean real-time status indicators with zero authentication requirement.
- [ ] Fast response time (< 50ms) to ensure health probes do not add server overhead.
