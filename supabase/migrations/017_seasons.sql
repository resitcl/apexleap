-- ============================================================
-- ApexLeap - Migration 017: Temporadas (Apertura / Clausura)
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

-- ── 1. SEASON TYPE ENUM ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE season_type AS ENUM ('apertura', 'clausura', 'pretemporada', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. CLUB SEASONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_seasons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,            -- Ej: "Apertura 2025"
  type        season_type NOT NULL DEFAULT 'apertura',
  year        INTEGER NOT NULL,         -- 2025
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false, -- Solo UNA activa a la vez
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, type, year)         -- Una Apertura/Clausura por año por club
);

CREATE INDEX IF NOT EXISTS idx_seasons_club    ON club_seasons(club_id);
CREATE INDEX IF NOT EXISTS idx_seasons_active  ON club_seasons(club_id, is_active);

-- ── 3. FK en competitions ────────────────────────────────────
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES club_seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_competitions_season ON competitions(club_id, season_id);

-- ── 4. FK en matches ─────────────────────────────────────────
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES club_seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(club_id, season_id);

-- ── 5. SEED: temporadas para los 2 clubes de prueba ─────────
DO $$
DECLARE
  v_club_fut   UUID;
  v_club_yoga  UUID;
BEGIN
  SELECT id INTO v_club_fut  FROM clubs WHERE slug = 'club-condores'    LIMIT 1;
  SELECT id INTO v_club_yoga FROM clubs WHERE slug = 'yoga-flow-studio' LIMIT 1;

  -- Fútbol: Apertura 2025 (activa) + Clausura 2025
  IF v_club_fut IS NOT NULL THEN
    INSERT INTO club_seasons (club_id, name, type, year, start_date, end_date, is_active)
    VALUES
      (v_club_fut, 'Apertura 2025',    'apertura',     2025, '2025-02-01', '2025-07-31', false),
      (v_club_fut, 'Clausura 2025',    'clausura',     2025, '2025-08-01', '2025-12-15', true),
      (v_club_fut, 'Pre-temporada 2026','pretemporada', 2026, '2026-01-05', '2026-01-31', false)
    ON CONFLICT (club_id, type, year) DO NOTHING;
  END IF;

  -- Yoga: solo una temporada anual
  IF v_club_yoga IS NOT NULL THEN
    INSERT INTO club_seasons (club_id, name, type, year, start_date, end_date, is_active)
    VALUES
      (v_club_yoga, 'Apertura 2025',  'apertura', 2025, '2025-03-01', '2025-07-31', false),
      (v_club_yoga, 'Clausura 2025',  'clausura', 2025, '2025-08-01', '2025-11-30', true)
    ON CONFLICT (club_id, type, year) DO NOTHING;
  END IF;
END $$;
