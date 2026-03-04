-- ============================================================
-- ApexLeap - Migration 014: Club Categories (Categorías por club)
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS club_categories (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id    UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT,
  description TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE club_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_categories_isolation" ON club_categories;
CREATE POLICY "club_categories_isolation"
  ON club_categories FOR ALL
  USING (club_id = (
    SELECT club_id FROM user_clubs
    WHERE user_id = auth.uid() AND is_active = TRUE
    LIMIT 1
  ));

CREATE INDEX IF NOT EXISTS idx_club_categories_club ON club_categories(club_id, sort_order);

-- athletes.category already TEXT from migration 012 — no change needed.
-- competitions: add optional category_id FK
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES club_categories(id) ON DELETE SET NULL;
