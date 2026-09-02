---
title: '[FEAT]: Automated Database Index Optimization & Slow Query Telemetry Monitor'
labels: 'enhancement, backend, database, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As the volume of quiz attempts, flashcard repetitions, and user activity logs grows, unindexed queries can lead to slow response times (high latency) and database bottlenecks during peak mock-exam hours.

This feature implements **Automated Database Index Optimization, Query Performance Logging & Slow Query Telemetry**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Sequelize Query Telemetry Middleware (`backend/config/dbTelemetry.js`)**:
   - Hooks into Sequelize query lifecycle to measure query execution duration in milliseconds.
   - Automatically logs any query taking longer than 150ms to slow-query telemetry logs with exact SQL statement and parameter signatures.
2. **B-Tree Compound Indexing Migrations**:
   - Creates targeted compound indexes on high-throughput lookup columns:
     - `QuizAttempts (userId, quizId, createdAt DESC)`
     - `Flashcards (deckId, nextReviewDate ASC, interval)`
     - `ActivityLogs (userId, eventType, timestamp DESC)`
     - `Topics (subjectId, confidenceStatus)`
3. **Admin Query Telemetry Endpoint**:
   - `GET /api/admin/telemetry/queries` - Provides administrators with p50, p95, and p99 query latency distributions and slowest running SQL routes.

---

## Acceptance Criteria
- [ ] Queries exceeding 150ms execution time are automatically logged with execution plans.
- [ ] Compound indexes applied via Sequelize migrations reduce quiz history and flashcard due query latency by over 50%.
- [ ] Telemetry endpoint reports p95 query latency accurately.
