-- Add opening/closing hours to venues
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS opening_time TIME,
  ADD COLUMN IF NOT EXISTS closing_time TIME;
