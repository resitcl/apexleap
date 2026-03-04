-- Add missing columns to clubs table
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS description TEXT;
