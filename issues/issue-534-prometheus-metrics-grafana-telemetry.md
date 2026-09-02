---
title: '[INFRA]: Prometheus Telemetry Exporter and Pre-configured Grafana Health Dashboard'
labels: 'infrastructure, devops, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Issue Type
Infrastructure / Observability / DevOps

## Priority
P1 High

## Summary
Integrate Prometheus metrics collection (`prom-client`) into the Express backend and deliver a pre-configured Dockerized Grafana monitoring dashboard with alerting rules.

## Problem Statement
In production environments, maintainers have no real-time visibility into HTTP request latencies (P95/P99), API error rates, active socket connections, or external AI API latency bottlenecks.

## Current Behavior
Only basic console logs exist, with no metric scrapers, time-series telemetry, or visual health dashboards.

## Expected Behavior
The backend exposes `/metrics` protected endpoint for Prometheus scraping, tracking HTTP duration histograms, memory RSS, GC pause times, and Gemini API latency; Grafana visualizes system health with alert triggers.

## User Story
As a DevOps engineer and maintainer
I want real-time metrics and latency dashboards
So that we can proactively detect performance bottlenecks and API downtime before students are affected

## Proposed Solution
1. Install `prom-client` in `backend/` and configure standard Node.js metric collectors (CPU, Memory, Event Loop Lag).
2. Add custom Prometheus metrics: `http_request_duration_seconds` (histogram), `ai_generation_duration_seconds`, `active_websocket_connections` (gauge).
3. Create `docker/monitoring/` directory containing `docker-compose.monitoring.yml`, `prometheus.yml`, and a provisioned Grafana dashboard JSON.

## Technical Scope

### Frontend Impact
None.

### Backend Impact
Add `backend/src/middleware/metricsMiddleware.js` and `GET /metrics` route.

### Database Impact
None.

### API Impact
GET `/metrics`.

## Acceptance Criteria
- [ ] `/metrics` endpoint outputs valid OpenMetrics format for Prometheus scrapers.
- [ ] Docker Compose brings up Prometheus and Grafana with pre-configured dashboard showing live QPS and latency gauges.
- [ ] Grafana alert rule configured for HTTP 5xx error rate spikes > 5% over a 5-minute window.

## Testing Requirements

### Unit Tests
- [ ] Test metric middleware timing accuracy with simulated API delay.

### Manual Testing
- [ ] Spin up `docker-compose -f docker/monitoring/docker-compose.monitoring.yml up` and check Grafana dashboard.

## Affected Areas
- [x] Backend
- [x] Infrastructure
- [x] DevOps

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
