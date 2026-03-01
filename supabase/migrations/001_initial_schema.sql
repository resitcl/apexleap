-- ============================================================
-- ApexLeap - Initial Schema
-- Multi-tenant SaaS for sports clubs and martial arts academies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE health_status AS ENUM ('healthy', 'injured', 'observation');
CREATE TYPE athlete_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'failed', 'cancelled');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual', 'single');
CREATE TYPE rule_type AS ENUM ('financial', 'attendance', 'discipline', 'documentation');
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'expired', 'rejected');
CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');

-- ============================================================
-- CLUBS (Tenants)
-- ============================================================

CREATE TABLE clubs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  sport_type    TEXT,
  logo_url      TEXT,
  primary_color   TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#ffffff',
  settings      JSONB NOT NULL DEFAULT '{}',
  address       TEXT,
  city          TEXT,
  country       TEXT DEFAULT 'Chile',
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER <-> CLUB MAPPING (for multi-tenant resolution)
-- ============================================================

CREATE TABLE user_clubs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    TEXT NOT NULL,            -- Clerk user ID
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'athlete',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, club_id)
);

CREATE INDEX idx_user_clubs_user_id ON user_clubs(user_id);
CREATE INDEX idx_user_clubs_club_id ON user_clubs(club_id);

-- ============================================================
-- HELPER FUNCTION: Get current user's club_id
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM user_clubs
  WHERE user_id = auth.uid()::TEXT
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ATHLETES
-- ============================================================

CREATE TABLE athletes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id             TEXT,                          -- Clerk user ID (optional)
  name                TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  document_number     TEXT,                          -- RUT / DNI
  birth_date          DATE,
  photo_url           TEXT,
  status              athlete_status NOT NULL DEFAULT 'active',
  health_status       health_status NOT NULL DEFAULT 'healthy',
  performance_meta    JSONB NOT NULL DEFAULT '{}',   -- Sport-specific metrics (goals, times, etc.)
  technical_meta      JSONB NOT NULL DEFAULT '{}',   -- Belt/grade (martial arts) or position/number (clubs)
  emergency_contact   TEXT,
  emergency_phone     TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_athletes_club_id ON athletes(club_id);
CREATE INDEX idx_athletes_user_id ON athletes(user_id);
CREATE INDEX idx_athletes_status ON athletes(club_id, status);

-- ============================================================
-- INJURIES (Health history)
-- ============================================================

CREATE TABLE injuries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  diagnosis       TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'mild',      -- mild, moderate, severe
  start_date      DATE NOT NULL,
  estimated_recovery DATE,
  actual_recovery DATE,
  notes           TEXT,
  created_by      TEXT,                              -- Clerk user ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_injuries_athlete_id ON injuries(athlete_id);
CREATE INDEX idx_injuries_club_id ON injuries(club_id);

-- ============================================================
-- PLANS
-- ============================================================

CREATE TABLE plans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  price             DECIMAL(10,2) NOT NULL DEFAULT 0,
  enrollment_fee    DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Matrícula
  billing_cycle     billing_cycle NOT NULL DEFAULT 'monthly',
  session_limit     INTEGER,                          -- NULL = unlimited
  multi_sede        BOOLEAN NOT NULL DEFAULT false,
  content_level     TEXT,                            -- basic, intermediate, pro
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  is_visible        BOOLEAN NOT NULL DEFAULT true,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_club_id ON plans(club_id);

-- ============================================================
-- ATHLETE SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES plans(id),
  status          TEXT NOT NULL DEFAULT 'active',    -- active, paused, cancelled
  start_date      DATE NOT NULL,
  end_date        DATE,
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  card_token      TEXT,                              -- Payment gateway token
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_athlete_id ON subscriptions(athlete_id);
CREATE INDEX idx_subscriptions_club_id ON subscriptions(club_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id       UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  plan_id          UUID REFERENCES plans(id),
  subscription_id  UUID REFERENCES subscriptions(id),
  concept          TEXT NOT NULL,
  amount           DECIMAL(10,2) NOT NULL,
  status           payment_status NOT NULL DEFAULT 'pending',
  due_date         DATE NOT NULL,
  paid_at          TIMESTAMPTZ,
  payment_method   TEXT,                             -- webpay, flow, khipu, mercadopago, cash, transfer
  transaction_id   TEXT,
  receipt_url      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_club_id ON payments(club_id);
CREATE INDEX idx_payments_athlete_id ON payments(athlete_id);
CREATE INDEX idx_payments_status ON payments(club_id, status);
CREATE INDEX idx_payments_due_date ON payments(club_id, due_date);

-- ============================================================
-- VENUES (Sedes)
-- ============================================================

CREATE TABLE venues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  lat           DECIMAL(10,7),
  lng           DECIMAL(10,7),
  geofence_radius INTEGER NOT NULL DEFAULT 50,       -- meters for check-in validation
  capacity      INTEGER,
  amenities     JSONB NOT NULL DEFAULT '[]',         -- ['vestuarios', 'cafetería', ...]
  is_home_venue BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venues_club_id ON venues(club_id);

-- ============================================================
-- SCHEDULES (Horarios)
-- ============================================================

CREATE TABLE schedules (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  venue_id       UUID REFERENCES venues(id),
  name           TEXT NOT NULL,
  description    TEXT,
  day_of_week    INTEGER[],                          -- 0=Sun, 1=Mon, ... 6=Sat
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE,
  capacity       INTEGER,
  coach_id       TEXT,                              -- Clerk user ID
  access_rule    TEXT NOT NULL DEFAULT 'subscription', -- open, subscription, profile
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_club_id ON schedules(club_id);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id   UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  schedule_id  UUID REFERENCES schedules(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_in_lat  DECIMAL(10,7),
  check_in_lng  DECIMAL(10,7),
  is_valid      BOOLEAN NOT NULL DEFAULT true,      -- false if geofencing failed
  is_justified  BOOLEAN NOT NULL DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_athlete_id ON attendance(athlete_id);
CREATE INDEX idx_attendance_club_id ON attendance(club_id);
CREATE INDEX idx_attendance_date ON attendance(club_id, checked_in_at);

-- ============================================================
-- RULES (Motor de Reglas)
-- ============================================================

CREATE TABLE rules (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       rule_type NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  -- config example: { "max_overdue_months": 1, "block_action": "nomina" }
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_club_id ON rules(club_id);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id   UUID REFERENCES athletes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,                        -- medical, authorization, institutional
  file_url     TEXT,
  status       document_status NOT NULL DEFAULT 'pending',
  expiry_date  DATE,
  notes        TEXT,
  uploaded_by  TEXT,                                 -- Clerk user ID
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_athlete_id ON documents(athlete_id);
CREATE INDEX idx_documents_club_id ON documents(club_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_clubs_updated_at
  BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_athletes_updated_at
  BEFORE UPDATE ON athletes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rules_updated_at
  BEFORE UPDATE ON rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE clubs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clubs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE injuries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;

-- Clubs: only members of the club can read it
CREATE POLICY "clubs_select" ON clubs FOR SELECT
  USING (id = get_user_club_id());

-- user_clubs: only your own records
CREATE POLICY "user_clubs_select" ON user_clubs FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Athletes: only same club
CREATE POLICY "athletes_select" ON athletes FOR SELECT
  USING (club_id = get_user_club_id());

CREATE POLICY "athletes_insert" ON athletes FOR INSERT
  WITH CHECK (club_id = get_user_club_id());

CREATE POLICY "athletes_update" ON athletes FOR UPDATE
  USING (club_id = get_user_club_id());

CREATE POLICY "athletes_delete" ON athletes FOR DELETE
  USING (club_id = get_user_club_id());

-- Injuries: only same club
CREATE POLICY "injuries_all" ON injuries FOR ALL
  USING (club_id = get_user_club_id());

-- Plans: only same club
CREATE POLICY "plans_all" ON plans FOR ALL
  USING (club_id = get_user_club_id());

-- Subscriptions: only same club
CREATE POLICY "subscriptions_all" ON subscriptions FOR ALL
  USING (club_id = get_user_club_id());

-- Payments: only same club
CREATE POLICY "payments_all" ON payments FOR ALL
  USING (club_id = get_user_club_id());

-- Venues: only same club
CREATE POLICY "venues_all" ON venues FOR ALL
  USING (club_id = get_user_club_id());

-- Schedules: only same club
CREATE POLICY "schedules_all" ON schedules FOR ALL
  USING (club_id = get_user_club_id());

-- Attendance: only same club
CREATE POLICY "attendance_all" ON attendance FOR ALL
  USING (club_id = get_user_club_id());

-- Rules: only same club
CREATE POLICY "rules_all" ON rules FOR ALL
  USING (club_id = get_user_club_id());

-- Documents: only same club
CREATE POLICY "documents_all" ON documents FOR ALL
  USING (club_id = get_user_club_id());
