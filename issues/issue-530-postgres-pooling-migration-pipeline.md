---
title: '[REFACTOR]: Connection Pooling Optimization and Automated Schema Migration Pipeline'
labels: 'enhancement, database, backend, high-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
Architecture Refactoring / Database Optimization / DevOps

## Priority
P1 High

## Summary
Refactor database connection pool management using `pg-pool` with health check heartbeats, idle timeout eviction, and an automated schema migration runner.

## Problem Statement
Under high concurrent student load, backend instances exhaust Postgres connection limits (`ECONNREFUSED` / `too many clients already`), and manual SQL script executions cause schema drift between development and production.

## Current Behavior
Database connections are created without bounded pool caps or lifecycle monitoring, and schema updates rely on ad-hoc manual scripts.

## Expected Behavior
Database connections utilize a robust, bounded connection pool (`pg-pool`) with health check probes, graceful shutdown on `SIGTERM`, and an automated migration runner (`node-pg-migrate` / Prisma migrate) executing before server boot.

## User Story
As a system engineer
I want resilient database connection pooling and deterministic migrations
So that server restarts and sudden traffic spikes do not crash database connections or cause schema drift

## Proposed Solution
1. Configure `backend/src/config/database.js` with `pg.Pool` tuning (`max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 2000`).
2. Add migration engine with `backend/migrations/` directory supporting up/down reversible SQL migrations.
3. Add `npm run db:migrate` script and invoke migration check in production Docker entrypoint.

## Technical Scope

### Frontend Impact
None.

### Backend Impact
Refactor database client wrapper, add migration CLI commands and pool telemetry.

### Database Impact
PostgreSQL connection pool tuning & `pgmigrations` tracking table.

### API Impact
Add `/api/health/db` endpoint reporting pool utilization stats.

## Acceptance Criteria
- [ ] Server handles 200 simultaneous API queries without connection starvation errors.
- [ ] `npm run db:migrate` applies pending migrations atomically with rollback support on failure.
- [ ] Graceful shutdown cleans up all active database pool connections on `SIGINT`/`SIGTERM`.

## Testing Requirements

### Unit Tests
- [ ] Unit tests for migration rollback and connection pool reconnect handlers.

### Manual Testing
- [ ] Run concurrent query stress test script and observe pool metric gauges.

## Affected Areas
- [x] Backend
- [x] Database
- [x] Infrastructure

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium / Intermediate) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
