-- Migration: Add Granular RBAC and Audit Logs for Study Squads
ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS permissions INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS squad_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES study_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_squad_audit_logs_squad_id ON squad_audit_logs(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_audit_logs_created_at ON squad_audit_logs(created_at);
