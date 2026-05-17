-- Adds optional match time (hora) to matches and rosters.
-- Nullable for backwards compatibility with existing rows.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_time TIME;

ALTER TABLE rosters
  ADD COLUMN IF NOT EXISTS match_time TIME;
