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

-- Custom auth (magic link only; password users use Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_magic_link_token ON magic_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_link_expires ON magic_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Onboarding: one row per user (user_id = app_users.id or auth.users.id)
CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id TEXT PRIMARY KEY,
  onboarding_data JSONB NOT NULL DEFAULT '{}',
  get_to_main BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_get_to_main ON user_onboarding(get_to_main);

-- Organization access: one request per user, pending until accepted
CREATE TABLE IF NOT EXISTS organization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_requests_user ON organization_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_requests_status ON organization_requests(status);

-- Linked calendar/email accounts (OAuth tokens per user per provider)
CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_user ON linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider ON linked_accounts(provider);

-- RLS: enable on all tables. With no policies, anon key has no access.
-- Service role (used server-side) bypasses RLS. Add policies only if you expose tables to the client.
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
