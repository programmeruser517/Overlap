-- Overlap schema for Supabase (Db + Auth later).
-- Run when wiring Supabase adapter.

-- Threads (core entity)
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('schedule', 'email')),
  status TEXT NOT NULL,
  prompt TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]',
  proposal JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_owner ON threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);

-- Audit log (optional; can use Supabase audit or custom table)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id TEXT,
  payload JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_thread ON audit_log(thread_id);
