-- ============================================================
-- MATCHES & MATCH EVENTS
-- Sport-agnostic stats per partido/jugador
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  roster_id      UUID REFERENCES rosters(id) ON DELETE SET NULL,
  opponent       TEXT,
  match_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  location       TEXT,
  is_home        BOOLEAN NOT NULL DEFAULT true,
  home_score     INTEGER,
  away_score     INTEGER,
  status         TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | in_progress | finished
  notes          TEXT,
  meta           JSONB NOT NULL DEFAULT '{}',        -- quarters, sets, periods, etc.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sport-agnostic per-player events
-- event_type examples (basketball): points_2, points_3, free_throw, rebound_off, rebound_def, assist, steal, block, foul, turnover
-- event_type examples (soccer):     goal, assist, yellow_card, red_card, save, foul, penalty, offside
-- event_type examples (volleyball): attack_point, serve_point, block_point, error, ace, dig
-- event_type examples (handball):   goal, assist, yellow_card, 2min_suspension, red_card, save, penalty
-- event_type examples (generic):    point, assist, foul, card
CREATE TABLE IF NOT EXISTS match_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  athlete_id   UUID REFERENCES athletes(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  event_value  NUMERIC NOT NULL DEFAULT 1,  -- pts scored, qty of rebounds, etc.
  minute       SMALLINT,                     -- match minute (optional)
  period       TEXT,                         -- Q1/Q2/Q3/Q4, 1T/2T, Set1, etc.
  team         TEXT NOT NULL DEFAULT 'home', -- home | away
  meta         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_club_id         ON matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_competition_id  ON matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id   ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_athlete_id ON match_events(athlete_id);
CREATE INDEX IF NOT EXISTS idx_match_events_club_id    ON match_events(club_id);

-- RLS
ALTER TABLE matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_all" ON matches FOR ALL
  USING (club_id = get_user_club_id());

CREATE POLICY "match_events_all" ON match_events FOR ALL
  USING (club_id = get_user_club_id());

-- Triggers
CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
