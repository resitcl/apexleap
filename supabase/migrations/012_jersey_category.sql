-- ============================================================
-- ApexLeap - Migration 012: Jersey number & athlete category
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

-- 1. Add jersey_number column (nullable integer)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS jersey_number INTEGER;

-- 2. Add category column with default 'General'
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';

-- 3. Partial unique index: no two active athletes in the same club+category
--    can share the same jersey number. NULL values are excluded (always allowed).
DROP INDEX IF EXISTS idx_athletes_jersey_per_category;
CREATE UNIQUE INDEX idx_athletes_jersey_per_category
  ON athletes(club_id, category, jersey_number)
  WHERE jersey_number IS NOT NULL;
