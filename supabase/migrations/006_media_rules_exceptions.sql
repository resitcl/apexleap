-- ============================================================
-- MEDIA ITEMS (Media Hub)
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_media_items_club_id  ON media_items(club_id);
CREATE INDEX IF NOT EXISTS idx_media_items_type     ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_category ON media_items(category);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_items_all" ON media_items FOR ALL
  USING (club_id = get_user_club_id());

CREATE TRIGGER trg_media_items_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RULE EXCEPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS rule_exceptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  rule_id     UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  expires_at  DATE,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_exceptions_club_id    ON rule_exceptions(club_id);
CREATE INDEX IF NOT EXISTS idx_rule_exceptions_athlete_id ON rule_exceptions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_rule_exceptions_rule_id    ON rule_exceptions(rule_id);

ALTER TABLE rule_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rule_exceptions_all" ON rule_exceptions FOR ALL
  USING (club_id = get_user_club_id());

-- ============================================================
-- ATTENDANCE: columna justification (si no existe)
-- ============================================================
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS justification TEXT,
  ADD COLUMN IF NOT EXISTS is_justified   BOOLEAN NOT NULL DEFAULT FALSE;
