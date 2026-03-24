-- ============================================================
-- Enrollment Approval System for Team Sports
-- Athletes must be approved before they can proceed to payment
-- ============================================================

-- Add enrollment_status to athletes table
-- Values: 'pending_approval', 'approved', 'rejected', NULL (for non-team sports or existing athletes)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS enrollment_status TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS enrollment_requested_at TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS enrollment_reviewed_at TIMESTAMPTZ;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS enrollment_reviewed_by UUID REFERENCES user_clubs(id);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS enrollment_notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_athletes_enrollment_status ON athletes(club_id, enrollment_status) WHERE enrollment_status IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN athletes.enrollment_status IS 'For team sports: pending_approval, approved, rejected. NULL for non-team sports or legacy athletes.';
