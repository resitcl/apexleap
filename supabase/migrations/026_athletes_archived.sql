-- Soft-delete for athletes: hide from lists but keep row (payments stay linked)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN athletes.archived_at IS 'When set, athlete is removed from operations but payments/history remain.';

CREATE INDEX IF NOT EXISTS idx_athletes_club_active ON athletes(club_id) WHERE archived_at IS NULL;
