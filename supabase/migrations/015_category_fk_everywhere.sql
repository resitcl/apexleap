-- ============================================================
-- ApexLeap - Migration 015: category_id FK on athletes + matches
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

-- Athletes: add category_id FK (keep category TEXT for display/fallback)
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES club_categories(id) ON DELETE SET NULL;

-- Matches: add category_id FK
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES club_categories(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_athletes_category  ON athletes(club_id, category_id);
CREATE INDEX IF NOT EXISTS idx_matches_category   ON matches(club_id, category_id);
