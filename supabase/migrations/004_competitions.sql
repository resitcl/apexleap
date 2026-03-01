-- ============================================================
-- COMPETITIONS / TOURNAMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS competitions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'tournament',  -- tournament, league, friendly, championship
  sport        TEXT,
  location     TEXT,
  start_date   DATE NOT NULL,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'upcoming',    -- upcoming, active, finished, cancelled
  description  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROSTERS (nóminas matchday)
-- ============================================================

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

CREATE TABLE IF NOT EXISTS roster_athletes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roster_id  UUID NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  number     INTEGER,
  position   TEXT,
  is_captain BOOLEAN NOT NULL DEFAULT FALSE,
  status     TEXT NOT NULL DEFAULT 'called',  -- called, confirmed, absent
  UNIQUE(roster_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_competitions_club_id  ON competitions(club_id);
CREATE INDEX IF NOT EXISTS idx_rosters_club_id       ON rosters(club_id);
CREATE INDEX IF NOT EXISTS idx_roster_athletes_roster ON roster_athletes(roster_id);

ALTER TABLE competitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions_all" ON competitions FOR ALL
  USING (club_id = get_user_club_id());

CREATE POLICY "rosters_all" ON rosters FOR ALL
  USING (club_id = get_user_club_id());

CREATE POLICY "roster_athletes_all" ON roster_athletes FOR ALL
  USING (
    roster_id IN (
      SELECT id FROM rosters WHERE club_id = get_user_club_id()
    )
  );

CREATE TRIGGER trg_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rosters_updated_at
  BEFORE UPDATE ON rosters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
