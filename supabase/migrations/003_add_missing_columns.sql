-- ============================================================
-- ApexLeap - Migration 003: Add missing columns
-- Run this after 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- USERS TABLE (Clerk user sync via webhook)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id   TEXT UNIQUE NOT NULL,
  email      TEXT,
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: users can only see their own record
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_record" ON users FOR ALL
  USING (clerk_id = auth.uid()::TEXT);

-- ============================================================
-- CLUBS: add missing columns
-- ============================================================

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS timezone    TEXT NOT NULL DEFAULT 'America/Santiago';

-- ============================================================
-- SUBSCRIPTIONS: add missing columns
-- ============================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes          TEXT;

-- ============================================================
-- RULES: add missing columns used by the rules engine
-- (original schema had 'config JSONB', adding semantic columns)
-- ============================================================

ALTER TABLE rules ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS trigger_condition JSONB NOT NULL DEFAULT '{}';
ALTER TABLE rules ADD COLUMN IF NOT EXISTS action            TEXT NOT NULL DEFAULT 'block';  -- block | warn | notify
ALTER TABLE rules ADD COLUMN IF NOT EXISTS severity          TEXT NOT NULL DEFAULT 'medium'; -- low | medium | high

-- Migrate existing config data to trigger_condition
UPDATE rules SET trigger_condition = config WHERE trigger_condition = '{}' AND config != '{}';

-- ============================================================
-- CHECK-IN TOKENS: ephemeral tokens for QR-based check-in
-- ============================================================

CREATE TABLE IF NOT EXISTS check_in_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  schedule_id UUID REFERENCES schedules(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_in_tokens_token   ON check_in_tokens(token);
CREATE INDEX IF NOT EXISTS idx_check_in_tokens_club_id ON check_in_tokens(club_id);

-- Allow public read on valid tokens (needed for unauthenticated QR scan)
ALTER TABLE check_in_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "check_in_tokens_public_read" ON check_in_tokens FOR SELECT
  USING (expires_at > NOW());

-- ============================================================
-- EXPENSES (Admin Financiera – egresos del club)
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  concept     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other', -- rent, salary, supplies, maintenance, other
  amount      DECIMAL(10,2) NOT NULL,
  date        DATE NOT NULL,
  paid_to     TEXT,           -- vendor / employee name
  notes       TEXT,
  receipt_url TEXT,
  created_by  TEXT,           -- Clerk user ID
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_club_id ON expenses(club_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date    ON expenses(club_id, date);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON expenses FOR ALL
  USING (club_id = get_user_club_id());

-- ============================================================
-- COACHES (Staff del club – para nómina)
-- ============================================================

CREATE TABLE IF NOT EXISTS coaches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id      TEXT,          -- Clerk user ID (optional)
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  specialty    TEXT,          -- Discipline / specialty
  salary_type  TEXT NOT NULL DEFAULT 'fixed', -- fixed | per_session | percentage
  salary_amount DECIMAL(10,2),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_club_id ON coaches(club_id);

CREATE TRIGGER trg_coaches_updated_at
  BEFORE UPDATE ON coaches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaches_all" ON coaches FOR ALL
  USING (club_id = get_user_club_id());
