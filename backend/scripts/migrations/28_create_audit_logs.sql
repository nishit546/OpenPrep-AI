-- Migration to create the AuditLogs table for query performance profiling

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "query" TEXT NOT NULL,
  "executionTime" INTEGER NOT NULL,
  "executionPlan" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "auditlogs_executiontime_idx" ON "AuditLogs" ("executionTime");
