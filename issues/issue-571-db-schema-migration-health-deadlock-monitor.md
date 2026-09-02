---
title: '[FEAT]: Automated Database Schema Migration Health-Check & Deadlock Monitoring Dashboard'
labels: 'enhancement, backend, database, devops, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
During high-traffic exam seasons and continuous deployment of new database migrations, database connection pooling issues, table lock contentions, and slow unindexed queries can cause latency spikes and 500 errors across the application.

This feature implements a **Database Health Monitoring & Migration Status Verification Pipeline** for PostgreSQL and SQLite.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Database Health Metrics Collector (`backend/services/dbHealthService.js`)**:
   - Checks active vs idle client connections against `pool.max` settings.
   - Queries `pg_stat_activity` and `pg_stat_statements` (on PostgreSQL) to detect queries running longer than 1000ms and active lock waits.
   - Calculates database table bloat and index cache hit ratios ($>99%$ target).
2. **Migration Verifier (`backend/services/migrationVerifier.js`)**:
   - Compares executed migrations in `SequelizeMeta` table with local migration files in `backend/migrations/` to detect pending or out-of-sync migrations on server boot.
3. **REST Endpoints (`backend/controllers/dbAdminController.js`)**:
   - `GET /api/admin/db/status` - Secured admin endpoint returning pool statistics, migration sync status, and slow query diagnostics.
   - `POST /api/admin/db/vacuum-analyze` - Triggers non-blocking maintenance analyze on high-traffic tables.

---

## Acceptance Criteria
- [ ] Server boot log reports database connection pool health and confirms zero pending migrations.
- [ ] Admin endpoint provides JSON diagnostics of pool saturation, average query latency, and slow query logs.
- [ ] Graceful connection drain handling during SIGTERM server shutdown.
- [ ] Automated Jest tests for connection pooling edge cases and reconnection resilience.
