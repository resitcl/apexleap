-- ============================================================
-- ApexLeap - Migration 008: Fix all missing columns (idempotent)
-- Run this ONCE in Supabase SQL Editor if you haven't applied
-- migrations 003, 005, 006 yet.
-- ============================================================

-- clubs
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS timezone    TEXT NOT NULL DEFAULT 'America/Santiago';

-- venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE venues ADD COLUMN IF NOT EXISTS opening_time  TIME;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS closing_time  TIME;

-- injuries
ALTER TABLE injuries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes          TEXT;

-- rules (semantic columns for the rules engine)
ALTER TABLE rules ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS trigger_condition JSONB NOT NULL DEFAULT '{}';
ALTER TABLE rules ADD COLUMN IF NOT EXISTS action            TEXT NOT NULL DEFAULT 'block';
ALTER TABLE rules ADD COLUMN IF NOT EXISTS severity          TEXT NOT NULL DEFAULT 'medium';

-- Migrate existing rules config to trigger_condition
UPDATE rules SET trigger_condition = config
  WHERE trigger_condition = '{}' AND config IS NOT NULL AND config != '{}';

-- updated_at auto-trigger for venues (safe – drops first if exists)
DROP TRIGGER IF EXISTS trg_venues_updated_at   ON venues;
DROP TRIGGER IF EXISTS trg_injuries_updated_at ON injuries;

CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_injuries_updated_at
  BEFORE UPDATE ON injuries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- users table (needed for Clerk webhook sync)
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

-- check_in_tokens table (needed for QR check-in)
CREATE TABLE IF NOT EXISTS check_in_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  schedule_id UUID REFERENCES schedules(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_check_in_tokens_token   ON check_in_tokens(token);
CREATE INDEX IF NOT EXISTS idx_check_in_tokens_club_id ON check_in_tokens(club_id);

-- expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  concept     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other',
  amount      DECIMAL(10,2) NOT NULL,
  date        DATE NOT NULL,
  paid_to     TEXT,
  notes       TEXT,
  receipt_url TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_club_id ON expenses(club_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date    ON expenses(club_id, date);

-- coaches table
CREATE TABLE IF NOT EXISTS coaches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id       TEXT,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  specialty     TEXT,
  salary_type   TEXT NOT NULL DEFAULT 'fixed',
  salary_amount DECIMAL(10,2),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coaches_club_id ON coaches(club_id);

-- inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'other', -- equipment, uniform, infrastructure, other
  description    TEXT,
  quantity       INTEGER NOT NULL DEFAULT 1,
  quantity_min   INTEGER NOT NULL DEFAULT 0,
  condition      TEXT NOT NULL DEFAULT 'good',  -- good, fair, poor, broken
  assigned_to    UUID REFERENCES athletes(id) ON DELETE SET NULL,
  purchase_date  DATE,
  purchase_price DECIMAL(10,2),
  serial_number  TEXT,
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_club_id ON inventory_items(club_id);
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'tournament',
  sport       TEXT,
  location    TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'upcoming',
  description TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_competitions_club_id ON competitions(club_id);
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "competitions_all" ON competitions;
CREATE POLICY "competitions_all" ON competitions FOR ALL USING (club_id = get_user_club_id());
DROP TRIGGER IF EXISTS trg_competitions_updated_at ON competitions;
CREATE TRIGGER trg_competitions_updated_at
  BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- rosters table
CREATE TABLE IF NOT EXISTS rosters (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  match_date     DATE NOT NULL,
  opponent       TEXT,
  venue          TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rosters_club_id ON rosters(club_id);
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rosters_all" ON rosters;
CREATE POLICY "rosters_all" ON rosters FOR ALL USING (club_id = get_user_club_id());

-- roster_athletes table
CREATE TABLE IF NOT EXISTS roster_athletes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roster_id  UUID NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  number     INTEGER,
  position   TEXT,
  is_captain BOOLEAN NOT NULL DEFAULT FALSE,
  status     TEXT NOT NULL DEFAULT 'called',
  UNIQUE(roster_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS idx_roster_athletes_roster ON roster_athletes(roster_id);
ALTER TABLE roster_athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roster_athletes_all" ON roster_athletes;
CREATE POLICY "roster_athletes_all" ON roster_athletes FOR ALL
  USING (roster_id IN (SELECT id FROM rosters WHERE club_id = get_user_club_id()));

-- media_items table
CREATE TABLE IF NOT EXISTS media_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video','photo','document')),
  category      TEXT NOT NULL DEFAULT 'other'  CHECK (category IN ('match','highlight','training','photo','other')),
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  description   TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_items_club_id ON media_items(club_id);
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_items_all" ON media_items;
CREATE POLICY "media_items_all" ON media_items FOR ALL USING (club_id = get_user_club_id());

-- rule_exceptions table
CREATE TABLE IF NOT EXISTS rule_exceptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  rule_id    UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,
  expires_at DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rule_exceptions_club_id    ON rule_exceptions(club_id);
CREATE INDEX IF NOT EXISTS idx_rule_exceptions_athlete_id ON rule_exceptions(athlete_id);
ALTER TABLE rule_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rule_exceptions_all" ON rule_exceptions;
CREATE POLICY "rule_exceptions_all" ON rule_exceptions FOR ALL USING (club_id = get_user_club_id());

-- attendance extra columns
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_justified  BOOLEAN NOT NULL DEFAULT FALSE;
