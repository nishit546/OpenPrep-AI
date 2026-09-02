---
title: '[FEAT]: Comprehensive Database Indexing & Query Optimization Suite for High-Concurrency Flashcard & Quiz Queries'
labels: 'enhancement, database, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
As OpenPrep AI scales to thousands of active students, database queries for fetching due flashcards, aggregating daily activity streaks, and calculating topic progress percentiles suffer from full table scans and high latency ($> 850\text{ms}$).

This feature introduces a comprehensive **PostgreSQL Indexing, Partial Indexing, and Query Optimization Suite** with automated slow-query logging and connection pool tuning.

---

## Technical Scope & Architecture

### Database Schema & Indexing Migrations
1. **Composite & Partial Indexes (`backend/migrations/20260830_add_performance_indexes.sql`)**:
   - `CREATE INDEX idx_flashcards_user_due ON "Flashcards" ("userId", "nextReviewDate") WHERE "isArchived" = false;`
   - `CREATE INDEX idx_quiz_attempts_user_exam ON "QuizAttempts" ("userId", "examId", "createdAt" DESC);`
   - `CREATE INDEX idx_progress_user_subject ON "Progress" ("userId", "subjectId");`
   - `CREATE INDEX idx_activity_logs_user_date ON "ActivityLogs" ("userId", "createdAt" DESC);`
2. **Materialized View for Leaderboards & Analytics (`backend/migrations/20260830_leaderboard_materialized_view.sql`)**:
   - Materialized view aggregating user weekly XP, accuracy rate, and active streak with concurrent refresh triggers (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).

### Backend Optimization & Monitoring
1. **Database Query Profiler & Slow Query Logger (`backend/middleware/queryProfiler.js`)**:
   - Intercepts Sequelize / Prisma / pg queries and logs any database execution exceeding $100\text{ms}$ threshold with sanitized parameters and stack traces.
2. **Connection Pool & Keep-Alive Tuning (`backend/config/db.js`)**:
   - Configures optimal pool settings: `max: 25`, `min: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 2000`.

---

## Acceptance Criteria
- [ ] Due flashcard query latency drops below $25\text{ms}$ under 500 concurrent simulated requests.
- [ ] Materialized views refresh efficiently without locking reads on leaderboard endpoints.
- [ ] Slow query middleware captures and logs queries exceeding $100\text{ms}$ with full execution plans in development.
- [ ] Automated Jest database benchmark tests confirm index usage using `EXPLAIN ANALYZE`.
