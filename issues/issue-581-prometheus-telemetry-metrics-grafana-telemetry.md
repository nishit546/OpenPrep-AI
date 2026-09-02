---
title: '[FEAT]: Prometheus Telemetry Metrics Exporter & Grafana Dashboard for API Latency & AI Token Counts'
labels: 'enhancement, devops, backend, infrastructure, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
To maintain 99.9% uptime during peak exam hours and optimize operational costs, engineering maintainers need real-time visibility into server CPU/RAM usage, API endpoint latencies, database query times, and upstream AI token expenditures.

This feature sets up a **Prometheus Metrics Exporter and Ready-to-Import Grafana Telemetry Dashboard**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Prometheus Metrics Middleware (`backend/services/metricsService.js`)**:
   - Uses `prom-client` to track core telemetry metrics:
     - `http_request_duration_seconds`: Histogram of response latencies bucketed by route and status code.
     - `http_requests_total`: Counter of total HTTP requests labeled by method, path, and HTTP status.
     - `db_query_duration_seconds`: Histogram of database execution times.
     - `ai_tokens_consumed_total`: Counter of input/output tokens used across Gemini models.
     - `active_websocket_connections`: Gauge tracking live connected study squad sockets.
2. **Secured Metrics Endpoint**:
   - `GET /metrics` - Exposes standard Prometheus scrape format, secured via internal Bearer token / IP whitelist.
3. **Grafana Dashboard JSON Specification (`docs/telemetry/grafana-openprep-dashboard.json`)**:
   - Pre-configured dashboard panels for P95/P99 latency, requests per second (RPS), error rates ($4xx/5xx$), and AI cost estimations.

---

## Acceptance Criteria
- [ ] `/metrics` endpoint exposes Prometheus-formatted gauges, counters, and histograms with sub-1ms overhead.
- [ ] AI token consumption is tracked accurately per endpoint and model.
- [ ] Grafana JSON dashboard imports smoothly and visualizes API traffic in real-time.
- [ ] Unit tests confirm metrics counters increment correctly across HTTP request lifecycles.
