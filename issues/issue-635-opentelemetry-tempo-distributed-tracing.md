---
title: '[DEVOPS]: Full-Stack Distributed Tracing with OpenTelemetry, Grafana Tempo & Prometheus Alerts'
labels: 'devops, observability, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
When an AI-generated quiz or PYQ batch analysis takes several seconds, it is difficult to determine whether the bottleneck stems from frontend rendering, Redis cache misses, PostgreSQL connection wait times, or external Google Gemini API rate throttling.

This feature instruments **End-to-End Distributed Tracing across Frontend and Backend using the OpenTelemetry SDK**, exporting traces to Grafana Tempo and aggregating p95/p99 latency alerts with Prometheus.

---

## Technical Scope & Architecture

### Observability & Tracing Infrastructure
1. **OpenTelemetry Backend Auto-Instrumentation (`backend/config/tracing.js`)**:
   - Initializes `@opentelemetry/sdk-node` with auto-instrumentations for `http`, `express`, `pg`, and `ioredis`.
   - Propagates W3C Trace Context headers (`traceparent`, `tracestate`) across HTTP calls.
   - Custom spans for external AI API calls (`gemini_generate_content`, `gemini_embeddings`) capturing token count metrics and model latency.
2. **Frontend Trace Context Propagation (`frontend/src/services/apiClient.js`)**:
   - Injects OpenTelemetry trace headers into Axios/Fetch API requests to link user UI clicks to backend DB spans.
3. **Telemetry Exporter & Grafana Alert Rules (`docker-compose.observability.yml`)**:
   - Configures OpenTelemetry Collector container exporting to Grafana Tempo (traces) and Prometheus (metrics).
   - Alert rules for API p99 latency $> 1,500\text{ms}$ and error rate $> 2\%$.

---

## Acceptance Criteria
- [ ] Every incoming API request receives a unique `trace_id` propagated through all downstream spans.
- [ ] Custom spans accurately record duration and token usage for all Google Gemini AI requests.
- [ ] Traces render in Grafana Tempo showing full waterfall breakdowns from frontend click to DB query.
- [ ] Overhead of OpenTelemetry instrumentation does not exceed 1.5% CPU/memory in production.
