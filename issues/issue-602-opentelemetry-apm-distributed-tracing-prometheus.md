---
title: '[FEAT]: Comprehensive OpenTelemetry Distributed Tracing & APM Integration with Prometheus / Jaeger'
labels: 'enhancement, devops, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
When complex AI generation or multi-step database transactions fail or experience high latency in production, developers lack granular visibility into which micro-operation (DB query, Redis cache lookup, Gemini API call, or network transit) caused the bottleneck.

This feature integrates **OpenTelemetry Distributed Tracing and Prometheus Metrics Telemetry** across backend API routes, database operations, and external AI calls.

---

## Technical Scope & Architecture

### Backend Architecture
1. **OpenTelemetry SDK Initialization (`backend/config/telemetry.js`)**:
   - Configures OpenTelemetry Node SDK with auto-instrumentations for Express, `pg` / Sequelize, Redis, and HTTP external client requests.
   - Exports traces to OpenTelemetry Collector / Jaeger via OTLP gRPC/HTTP protocol.
2. **Prometheus Metrics Collector (`backend/middleware/metricsMiddleware.js`)**:
   - Exposes standard `/metrics` endpoint with custom application metrics:
     * `openprep_http_request_duration_seconds` (Histogram labeled by route, status code, method).
     * `openprep_ai_token_usage_total` (Counter labeled by model and feature).
     * `openprep_active_websocket_connections` (Gauge tracking live study squad & battle connections).
     * `openprep_db_pool_active_connections` (Gauge tracking DB pool utilization).

---

## Acceptance Criteria
- [ ] `/metrics` endpoint outputs Prometheus-compliant telemetry scraping format.
- [ ] Trace spans accurately correlate incoming HTTP requests with downstream database queries and AI API calls.
- [ ] Negligible performance overhead ($< 1.5\text{ms}$ per request) when telemetry collection is enabled.
- [ ] Docker Compose updated with optional Prometheus & Jaeger services for local observability development.
