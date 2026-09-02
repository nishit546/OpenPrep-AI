---
title: '[PERF]: Automated PostgreSQL Query Performance Profiler & Slow Query Indexing Advisor'
labels: 'performance, database, backend, low-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As the dataset grows with thousands of quiz attempts, flashcard reviews, and PYQ paper metadata, unindexed joins and sequential scans on large tables (e.g. `quiz_attempts`, `user_study_logs`, `document_chunks`) cause query latency spikes and database connection pool exhaustion.

This feature integrates an **Automated Query Profiling Middleware & Index Recommendation Engine** into the backend to capture slow queries in real-time, generate `EXPLAIN (ANALYZE, BUFFERS)` execution plans, and recommend composite B-tree or partial indexes.

---

## Technical Scope & Architecture

### Backend Profiling & Diagnostics
1. **Query Telemetry Interceptor (`backend/middleware/queryProfiler.js`)**:
   - Wraps database query executors (`pg` pool client); measures execution time in milliseconds.
   - Any query exceeding threshold ($T > 100\text{ms}$) is intercepted and asynchronously analyzed via `EXPLAIN (ANALYZE, FORMAT JSON)`.
   - Logs query signature, parameterized SQL, scan type (`Seq Scan`, `Index Scan`, `Bitmap Heap Scan`), and buffer hit ratios.
2. **Indexing Advisor Service (`backend/services/indexAdvisorService.js`)**:
   - Parses sequential scans on filter predicates (`WHERE topic_id = ... AND created_at >= ...`).
   - Generates executable migration snippets (`CREATE INDEX CONCURRENTLY idx_quiz_topic_created ...`).
   - Admin Endpoint: `GET /api/admin/db/slow-queries` and `GET /api/admin/db/index-recommendations`.

---

## Acceptance Criteria
- [ ] Profiler logs queries taking longer than 100ms without adding measurable overhead ($< 1\text{ms}$) to normal operations.
- [ ] Captures `EXPLAIN ANALYZE` execution trees with exact cost, loop count, and disk read metrics.
- [ ] Automatically detects sequential table scans on tables with $>10,000$ rows and proposes index DDL.
- [ ] Admin dashboard displays top-10 slowest queries grouped by normalized query hash.
